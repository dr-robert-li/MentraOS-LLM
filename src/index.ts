import path from 'path';
import {
  AppSession,
  AppServer, PhotoData,
  GIVE_APP_CONTROL_OF_TOOL_RESPONSE,
  ToolCall,
  logger
} from '@mentra/sdk';
import { MiraAgent } from './agents';
import { NewsAgent } from './agents/NewsAgent';
import { NotificationFilterAgent } from './agents/NotificationFilterAgent';
import { wrapText, TranscriptProcessor } from './utils';
import { LLMProvider } from './utils/LLMProvider';
import { getAllToolsForUser } from './agents/tools/TpaTool';
import { log } from 'console';

// Export SessionManager for Node.js deployment
export { MentraOSSessionManager, sessionManager } from './SessionManager';

// Environment interface for Node.js deployment
interface Env {
  // Environment variables
  AUGMENTOS_API_KEY?: string;
  LOCATIONIQ_TOKEN?: string;
  PACKAGE_NAME?: string;
  PORT?: string;
  REDIS_URL?: string;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 80;
const PACKAGE_NAME = process.env.PACKAGE_NAME;
const AUGMENTOS_API_KEY = process.env.AUGMENTOS_API_KEY;
const LOCATIONIQ_TOKEN = process.env.LOCATIONIQ_TOKEN;

const PROCESSING_SOUND_URL = "https://mira.augmentos.cloud/popping.mp3";
const START_LISTENING_SOUND_URL = "https://mira.augmentos.cloud/start.mp3";

if (!AUGMENTOS_API_KEY) {
  throw new Error('AUGMENTOS_API_KEY is not set');
}

if (!PACKAGE_NAME) {
  throw new Error('PACKAGE_NAME is not set');
}

logger.info(`🚀🚀🚀 Starting ${PACKAGE_NAME} server on port ${PORT}... 🚀🚀🚀`);

// Wake words that trigger Mentra
const explicitWakeWords = [
  "hey mentra", "he mentra", "hay mentra", "hai mentra", "hi mentra", "hei mentra",
  "hey mantra", "he mantra", "hey mentor", "he mentor", "hey menta", "he menta", 
  "hey mental", "he mental", "hey center", "he center", "hey centro", "he centro",
  "hey menter", "he menter", "hey mentora", "he mentora", "hey mentro", "he mentro",
  "hey metra", "he metra", "hey metro", "he metro", "hey mentara", "he mentara",
  "hey mentrah", "he mentrah", "hey mentral", "he mentral", "hey mintra", "he mintra",
  "hey muntra", "he muntra", "hey montra", "he montra", "hey maintra", "he maintra",
  "hey motra", "he motra", "hey mencher", "he mencher", "hey mentcha", "he mentcha",
  "hey mentia", "he mentia", "hey mensra", "he mensra", "hey menstra", "he menstra",
  "hey menthra", "he menthra", "hey methera", "he methera", "hey menchera", "he menchera",
  "hey mentira", "he mentira", "hey mentara", "he mentara", "hey mentore", "he mentore",
  "hey mentru", "he mentru", "hey mentri", "he mentri", "hey mentry", "he mentry",
  "hey mendtra", "he mendtra", "hey mentraw", "he mentraw", "hey mentree", "he mentree",
  "hey mentray", "he mentray", "hey mentera", "he mentera", "hey mentrala", "he mentrala",
  "hey mentora", "he mentora", "hey mentula", "he mentula", "hey mentrali", "he mentrali",
  "hey-mentra", "he-mentra", "heymentra", "hementra", "ay mentra", "ey mentra",
  "yay mentra", "hey mentrah", "hey mentar", "he mentar", "hey mentir", "he mentir",
  "mentra", "menta"
];

// Original "mira" wake word
// const explicitWakeWords = [
//  "hey mira", "he mira", "hey mara", "he mara", "hey mirror", "he mirror",
//  "hey miara", "he miara", "hey mia", "he mia", "hey mural", "he mural",
//  "hey amira", "hey myra", "he myra", "hay mira", "hai mira", "hey-mira",
//  "he-mira", "heymira", "heymara", "hey mirah", "he mirah", "hey meera", "he meera",
//  "Amira", "amira", "a mira", "a mirror", "hey miller", "he miller", "hey milla", "he milla", "hey mila", "he mila",
//  "hey miwa", "he miwa", "hey mora", "he mora", "hey moira", "he moira",
//  "hey miera", "he miera", "hey mura", "he mura", "hey maira", "he maira",
//  "hey meara", "he meara", "hey mara", "he mara", "hey mina", "he mina",
//  "hey mirra", "he mirra", "hey mir", "he mir", "hey miro", "he miro",
//  "hey miruh", "he miruh", "hey meerah", "he meerah", "hey meira", "he meira",
//  "hei mira", "hi mira", "hey mere", "he mere", "hey murra", "he murra",
//  "hey mera", "he mera", "hey neera", "he neera", "hey murah", "he murah",
//  "hey mear", "he mear", "hey miras", "he miras", "hey miora", "he miora", "hey miri", "he miri",
//  "hey maura", "he maura", "hey maya", "he maya", "hey moora", "he moora",
//  "hey mihrah", "he mihrah", "ay mira", "ey mira", "yay mira", "hey mihra",
//  "hey mera", "hey mira", "hey mila", "hey mirra"
// ];
  
/**
 * Manages notifications for users
 */
class NotificationsManager {
  private notificationsPerUser = new Map<string, any[]>();

  addNotifications(userId: string, notifications: any[]): void {
    if (!this.notificationsPerUser.has(userId)) {
      this.notificationsPerUser.set(userId, []);
    }
    // Append new notifications
    const existing = this.notificationsPerUser.get(userId)!;
    this.notificationsPerUser.set(userId, existing.concat(notifications));
  }

  getLatestNotifications(userId: string, count: number = 5): any[] {
    const all = this.notificationsPerUser.get(userId) || [];
    return all.slice(-count);
  }

  clearNotifications(userId: string): void {
    this.notificationsPerUser.delete(userId);
  }
}

const notificationsManager = new NotificationsManager();

/**
 * Manages the transcription state for active sessions
 */
class TranscriptionManager {
  private isProcessingQuery: boolean = false;
  private isListeningToQuery: boolean = false;
  private timeoutId?: NodeJS.Timeout;
  private maxListeningTimeoutId?: NodeJS.Timeout; // 15-second hard cutoff timer
  private session: AppSession;
  private sessionId: string;
  private userId: string;
  private miraAgent: MiraAgent;
  private transcriptionStartTime: number = 0;

  private serverUrl: string;
  private transcriptProcessor: TranscriptProcessor;
  private activePhotos: Map<string, { promise: Promise<PhotoData>, photoData: PhotoData | null, lastPhotoTime: number }> = new Map();
  private logger: AppSession['logger'];

    /**
     * Tracks the last observed head position and a time window during which
     * a wake word will be accepted (only when the optional mode is enabled).
     * The window is started when the head position changes from 'down' -> 'up'.
     */
    private lastHeadPosition: string | null = null;
    private headWakeWindowUntilMs: number = 0;
    private transcriptionUnsubscribe?: () => void;
    private headWindowTimeoutId?: NodeJS.Timeout;

  constructor(session: AppSession, sessionId: string, userId: string, miraAgent: MiraAgent, serverUrl: string) {
    this.session = session;
    this.sessionId = sessionId;
    this.userId = userId;
    this.miraAgent = miraAgent;
    this.serverUrl = serverUrl;
    // Use same settings as LiveCaptions for now
    this.transcriptProcessor = new TranscriptProcessor(30, 3, 3, false);
    this.logger = session.logger.child({ service: 'Mira.TranscriptionManager' });
    // Initialize subscription state based on setting
    this.initTranscriptionSubscription();
  }

  /**
   * Process incoming transcription data
   */
  handleTranscription(transcriptionData: any): void {
    // If a query is already being processed, ignore additional transcriptions
    if (this.isProcessingQuery) {
      this.logger.info(`[Session ${this.sessionId}]: Query already in progress. Ignoring transcription.`);
      return;
    }

    const text = transcriptionData.text;
    // Clean the text: lowercase and remove punctuation for easier matching
    const cleanedText = text
      .toLowerCase()
      .replace(/[.,!?;:]/g, '') // remove all punctuation
      .replace(/\s+/g, ' ')     // normalize whitespace
      .trim();
    const hasWakeWord = explicitWakeWords.some(word => cleanedText.includes(word));

      // Optional setting: only allow wake word within 10s after head moves down->up
      const requireHeadUpWindow = !!this.session.settings.get<boolean>('wake_requires_head_up');
      const now = Date.now();
      const withinHeadWindow = now <= this.headWakeWindowUntilMs;

      // Gate wake word if the optional mode is enabled
      if (!this.isListeningToQuery) {
        if (!hasWakeWord) {
          return;
        }
        if (requireHeadUpWindow && !withinHeadWindow) {
          // Wake word was spoken but not within the head-up window; ignore
          this.logger.debug('Wake word ignored: outside head-up activation window');
          return;
        }
      }

    // if we have a photo and it's older than 5 seconds, delete it
    if (this.activePhotos.has(this.sessionId)) {
      const photo = this.activePhotos.get(this.sessionId);
      if (photo) {
        if (photo.lastPhotoTime + 5000 < Date.now()) {
          this.activePhotos.delete(this.sessionId);
        }
      }
    }

    if (!this.activePhotos.has(this.sessionId)) {
      // if we don't have a photo, get one
      if (this.session.capabilities?.hasCamera) {
        const getPhotoPromise = this.session.camera.requestPhoto();
        getPhotoPromise.then(photoData => {
          this.activePhotos.set(this.sessionId, {
            promise: getPhotoPromise,
            photoData: photoData,
            lastPhotoTime: Date.now()
          });
          setTimeout(() => {
            // if we have a photo and it's older than 30 seconds, delete it
            if (this.activePhotos.has(this.sessionId) && this.activePhotos.get(this.sessionId)?.promise == getPhotoPromise) {
              this.activePhotos.delete(this.sessionId);
            }
          }, 30000);
        }, error => {
          this.logger.error(error, `[Session ${this.sessionId}]: Error getting photo:`);
          this.activePhotos.delete(this.sessionId);
        });
        this.activePhotos.set(this.sessionId, {
          // promise: this.session.camera.requestPhoto(), // Keep original promise for compatibility
          promise: getPhotoPromise, // Keep original promise for compatibility
          photoData: null,
          lastPhotoTime: Date.now()
        });
      }
    }

    if (!this.isListeningToQuery) {
      // play new sound effect
      const hasScreenStart = this.session.capabilities?.hasDisplay;
      if (this.session.settings.get<boolean>("speak_response") || !hasScreenStart) {
        this.session.audio.playAudio({audioUrl: START_LISTENING_SOUND_URL});
      }
      try {
        this.session.location.getLatestLocation({accuracy: "high"}).then(location => {
          if (location) {
            this.handleLocation(location);
          }
        }, error => {
          this.session.logger.warn(error, 'Error getting location');
        });
      } catch (error) {
        this.session.logger.warn(error, 'Error getting location');
      }

      // Start 15-second maximum listening timer
      this.maxListeningTimeoutId = setTimeout(() => {
        this.session.logger.info('Maximum listening time (15s) reached, forcing query processing');
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = undefined;
        }
        this.processQuery(text, 15000);
      }, 15000);
    }

    this.isListeningToQuery = true;

    // If this is our first detection, start the transcription timer
    if (this.transcriptionStartTime === 0) {
      this.transcriptionStartTime = Date.now();
    }



    // Remove wake word for display
    const displayText = this.removeWakeWord(text);
    // Only show 'Listening...' if there is no text after the wake word and nothing has been shown yet
    if (displayText.trim().length === 0) {
      // Show 'Listening...' only if the last shown text was not 'Listening...'
      if (this.transcriptProcessor.getLastUserTranscript().trim().length !== 0) {
        this.transcriptProcessor.processString('', false); // Clear the partial
      }
      this.session.layouts.showTextWall("Listening...", { durationMs: 10000 });
    } else {
      // Show the live query as the user is talking
      let formatted = 'Listening...\n\n' + this.transcriptProcessor.processString(displayText, !!transcriptionData.isFinal).trim();
      // Add a listening indicator if not final
      this.session.layouts.showTextWall(formatted, { durationMs: 20000 });
    }

    let timerDuration: number;

    if (transcriptionData.isFinal) {
      // Check if the final transcript ends with a wake word
      if (this.endsWithWakeWord(cleanedText)) {
        // If it ends with just a wake word, wait longer for additional query text
        this.logger.debug("transcriptionData.isFinal: ends with wake word");
        timerDuration = 10000;
      } else {
        // Final transcript with additional content should be processed soon
        timerDuration = 1500;
      }
    } else {
      //this.logger.debug("transcriptionData.isFinal: not final");
      // For non-final transcripts
      timerDuration = 3000;
    }

    // Clear any existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Set a new timeout to process the query
    this.timeoutId = setTimeout(() => {
      this.processQuery(text, timerDuration);
    }, timerDuration);
  }

  /**
   * Handle head position updates from the session. If the head transitions
   * from 'down' to 'up', open a 10s window during which the wake word will
   * activate listening (when the setting `wake_requires_head_up` is enabled).
   */
  public handleHeadPosition(headPositionData: any): void {
    try {
      // Derive a simple position string from provided data
      let current: string | null = null;
      if (typeof headPositionData === 'string') {
        current = headPositionData.toLowerCase();
      } else if (headPositionData && typeof headPositionData.position === 'string') {
        current = String(headPositionData.position).toLowerCase();
      }

      if (!current) {
        return;
      }

      const requireHeadUpWindow = !!this.session.settings.get<boolean>('wake_requires_head_up');
      if (!requireHeadUpWindow) {
        this.lastHeadPosition = current;
        return;
      }

      // Start window only on transition down -> up
      if (this.lastHeadPosition === 'down' && current === 'up') {
        this.headWakeWindowUntilMs = Date.now() + 10_000;
        this.logger.debug({ until: this.headWakeWindowUntilMs }, 'Head up detected: wake window opened for 10s');
        // Subscribe to transcriptions to listen for wake word during the window
        this.ensureTranscriptionSubscribed();
        // Stop listening after 10s if wake word not spoken
        if (this.headWindowTimeoutId) {
          clearTimeout(this.headWindowTimeoutId);
        }
        this.headWindowTimeoutId = setTimeout(() => {
          if (!this.isListeningToQuery) {
            this.logger.debug('Head-up window expired without wake word; unsubscribing from transcriptions');
            this.ensureTranscriptionUnsubscribed();
          }
          this.headWakeWindowUntilMs = 0;
          this.headWindowTimeoutId = undefined;
        }, 10_000);
      }

      this.lastHeadPosition = current;
    } catch (error) {
      this.logger.warn(error as Error, 'Failed to handle head position event');
    }
  }

  /**
   * Initialize subscription state based on the current setting.
   */
  public initTranscriptionSubscription(): void {
    const requireHeadUpWindow = !!this.session.settings.get<boolean>('wake_requires_head_up');
    if (requireHeadUpWindow) {
      // Start unsubscribed; will subscribe on head-up
      this.ensureTranscriptionUnsubscribed();
    } else {
      // Normal mode: always subscribe
      this.ensureTranscriptionSubscribed();
    }
  }

  private async getPhoto(): Promise<PhotoData | null> {
    if (this.activePhotos.has(this.sessionId)) {
      const photo = this.activePhotos.get(this.sessionId);
      if (photo && photo.photoData) {
        return photo.photoData;
      } else {
        if (photo?.promise) {
          // wait up to 3 seconds for promise to resolve
          this.logger.debug("Waiting for photo to resolve");
          const result = await Promise.race([
            photo.promise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
          ]) as PhotoData | null;
          this.logger.debug(result, "Photo resolved");
          return result;
        } else {
          return null;
        }
      }
    }
    return null;
  }

  /**
  * Handles location updates with robust error handling
  * Gracefully falls back to default values if location services fail
  */
  public async handleLocation(locationData: any): Promise<void> {
    this.logger.debug("Location data received", locationData);
    // Default fallback location context
    const fallbackLocationContext = {
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
      timezone: {
        name: 'Unknown',
        shortName: 'Unknown',
        fullName: 'Unknown',
        offsetSec: 0,
        isDst: false
      }
    };

    try {
      const { lat, lng } = locationData;

      if (!lat || !lng) {
        this.logger.debug('Invalid location data received, using fallback');
        this.miraAgent.updateLocationContext(fallbackLocationContext);
        return;
      }

      let locationInfo = { ...fallbackLocationContext };

      try {
        // Use LocationIQ for reverse geocoding
        const response = await fetch(
          `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_TOKEN}&lat=${lat}&lon=${lng}&format=json`
        );

        if (response.ok) {
          const data: any = await response.json();
          const address = data.address;

          if (address) {
            locationInfo.city = address.city || address.town || address.village || 'Unknown city';
            locationInfo.state = address.state || 'Unknown state';
            locationInfo.country = address.country || 'Unknown country';
          }
        } else {
          this.logger.warn(`LocationIQ reverse geocoding failed with status: ${response.status}`);
        }
      } catch (geocodingError) {
        this.logger.warn(geocodingError as Error, 'Reverse geocoding failed');
      }

      try {
        // Get timezone information
        const timezoneResponse = await fetch(
          `https://us1.locationiq.com/v1/timezone?key=${LOCATIONIQ_TOKEN}&lat=${lat}&lon=${lng}&format=json`
        );

        if (timezoneResponse.ok) {
          const timezoneData: any = await timezoneResponse.json();

          if (timezoneData.timezone) {
            locationInfo.timezone = {
              name: timezoneData.timezone.name || 'Unknown',
              shortName: timezoneData.timezone.short_name || 'Unknown',
              fullName: timezoneData.timezone.full_name || 'Unknown',
              offsetSec: timezoneData.timezone.offset_sec || 0,
              isDst: !!timezoneData.timezone.now_in_dst
            };
          }
        } else {
          this.logger.warn(`LocationIQ timezone API failed with status: ${timezoneResponse.status}`);
        }
      } catch (timezoneError) {
        this.logger.warn(timezoneError as Error, 'Timezone lookup failed');
      }

      // Update the MiraAgent with location context (partial or complete)
      this.miraAgent.updateLocationContext(locationInfo);

      this.logger.debug(`User location: ${locationInfo.city}, ${locationInfo.state}, ${locationInfo.country}, ${locationInfo.timezone.name}`);
    } catch (error) {
      this.logger.error(error, 'Error processing location:');
      // Always update MiraAgent with fallback location context to ensure it continues working
      this.miraAgent.updateLocationContext(fallbackLocationContext);
    }
  }

  /**
   * Process and respond to the user's query
   */
  private async processQuery(rawText: string, timerDuration: number): Promise<void> {
    // Calculate the actual duration from transcriptionStartTime to now
    const endTime = Date.now();
    let durationSeconds = 3; // fallback default
    if (this.transcriptionStartTime > 0) {
      durationSeconds = Math.max(1, Math.ceil((endTime - this.transcriptionStartTime) / 1000));
    } else if (timerDuration) {
      durationSeconds = Math.max(1, Math.ceil(timerDuration / 1000));
    }

    // Use the calculated duration in the backend URL
    const backendUrl = `${this.serverUrl}/api/transcripts/${this.sessionId}?duration=${durationSeconds}`;

    let transcriptResponse: Response;
    let transcriptionResponse: any;

    try {
      this.logger.debug(`[Session ${this.sessionId}]: Fetching transcript from: ${backendUrl}`);
      transcriptResponse = await fetch(backendUrl);

      this.logger.debug(`[Session ${this.sessionId}]: Response status: ${transcriptResponse.status}`);

      if (!transcriptResponse.ok) {
        throw new Error(`HTTP ${transcriptResponse.status}: ${transcriptResponse.statusText}`);
      }

      const responseText: string = await transcriptResponse.text();
      this.logger.debug(`[Session ${this.sessionId}]: Raw response body: ${responseText}`);

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response body received');
      }

      try {
        transcriptionResponse = JSON.parse(responseText);
      } catch (jsonError: any) {
        this.logger.error(jsonError, `[Session ${this.sessionId}]: JSON parsing failed:`);
        this.logger.error({ responseText }, `[Session ${this.sessionId}]: Response text that failed to parse: ${responseText}`);
        throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
      }

    } catch (fetchError: any) {
      this.logger.error(fetchError, `[Session ${this.sessionId}]: Error fetching transcript:` + fetchError.message);
      this.session.layouts.showTextWall(
        wrapText("Sorry, there was an error retrieving your transcript. Please try again.", 30),
        { durationMs: 5000 }
      );
      return;
    }

    if (!transcriptionResponse || !transcriptionResponse.segments || !Array.isArray(transcriptionResponse.segments)) {
      this.logger.error({ transcriptionResponse }, `[Session ${this.sessionId}]: Invalid response structure:`);
      this.session.layouts.showTextWall(
        wrapText("Sorry, the transcript format was invalid. Please try again.", 30),
        { durationMs: 5000 }
      );
      return;
    }

    const rawCombinedText = transcriptionResponse.segments.map((segment: any) => segment.text).join(' ');

    // Prevent multiple queries from processing simultaneously
    if (this.isProcessingQuery) {
      return;
    }

    this.isProcessingQuery = true;

    let isRunning = true;

    // Remove wake word from query
    const query = this.removeWakeWord(rawCombinedText);

    // Debug logging to understand what's happening
    this.logger.debug(`[processQuery] Raw text: "${rawCombinedText}"`);
    this.logger.debug(`[processQuery] Query after wake word removal: "${query}"`);

    if (query.trim().length === 0) {
      isRunning = false;
      this.logger.warn(`[processQuery] Empty query after processing. Raw text was: "${rawCombinedText}"`);
      this.session.layouts.showTextWall(
        wrapText("No query provided.", 30),
        { durationMs: 5000 }
      );
      this.isProcessingQuery = false;
      return;
    }

    const hasScreenProcessing = this.session.capabilities?.hasDisplay;
    if (this.session.settings.get<boolean>("speak_response") || !hasScreenProcessing) {
      this.session.audio.playAudio({ audioUrl: PROCESSING_SOUND_URL }).then(() => {
        if (isRunning) {
          this.session.audio.playAudio({ audioUrl: PROCESSING_SOUND_URL }).then(() => {
            if (isRunning) {
              this.session.audio.playAudio({ audioUrl: PROCESSING_SOUND_URL }).then(() => {
                if (isRunning) {
                  this.session.audio.playAudio({ audioUrl: PROCESSING_SOUND_URL }).then(() => {
                    if (isRunning) {
                      this.session.audio.playAudio({ audioUrl: PROCESSING_SOUND_URL });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    try {
      // Show the query being processed
      let displayQuery = query;
      if (displayQuery.length > 60) {
        displayQuery = displayQuery.slice(0, 60).trim() + ' ...';
      }
      this.session.layouts.showTextWall(
        wrapText("Processing query: " + displayQuery, 30),
        { durationMs: 8000 }
      );

      // Process the query with the Mira agent
      const inputData = { query, photo: await this.getPhoto() };
      // Pass session into LLMProvider to ensure correct provider/model/apiKey
      const llm = LLMProvider.getLLM(this.session);
      const agentResponse = await this.miraAgent.handleContext({
        ...inputData,
        llm
      });

      isRunning = false;

      if (!agentResponse) {
        this.logger.info("No insight found");
        this.showOrSpeakText("Sorry, I couldn't find an answer to that.");
      } else if (agentResponse === GIVE_APP_CONTROL_OF_TOOL_RESPONSE) {
        // the app is now in control, so don't do anything
      } else {
        let handled = false;
        if (typeof agentResponse === 'string') {
          try {
            const parsed = JSON.parse(agentResponse);

            // Generic event handler for tool outputs
            if (parsed && parsed.event) {
              switch (parsed.event) {
                // Add more cases here for future tool events
                // case 'notification':
                //   // handle notification event
                //   handled = true;
                //   break;
                default:
                  // Unknown event, fall through to default display
                  break;
              }
            }
          } catch (e) { /* not JSON, ignore */ }
        }

        if (!handled) {
          this.showOrSpeakText(agentResponse);
        }
      }
    } catch (error) {
      logger.error(error, `[Session ${this.sessionId}]: Error processing query:`);
      this.showOrSpeakText("Sorry, there was an error processing your request.");
    } finally {
      // Reset the state for future queries
      this.transcriptionStartTime = 0;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = undefined;
      }

      // Clear the maximum listening timer
      if (this.maxListeningTimeoutId) {
        clearTimeout(this.maxListeningTimeoutId);
        this.maxListeningTimeoutId = undefined;
      }

      // Reset listening state
      this.isListeningToQuery = false;
      // If head-up window mode is on and there is no active window, unsubscribe to save battery
      const requireHeadUpWindow = !!this.session.settings.get<boolean>('wake_requires_head_up');
      if (requireHeadUpWindow && Date.now() > this.headWakeWindowUntilMs) {
        this.ensureTranscriptionUnsubscribed();
      }

      // Clear transcript processor for next query
      this.transcriptProcessor.clear();

      // Reset processing state after a delay
      setTimeout(() => {
        this.isProcessingQuery = false;
      }, 2000);
    }
  }

  private async showOrSpeakText(text: string): Promise<void> {
    this.session.layouts.showTextWall(wrapText(text, 30), { durationMs: 5000 });
    const hasScreenProcess = this.session.capabilities?.hasDisplay;
    if (this.session.settings.get<boolean>("speak_response") || !hasScreenProcess) {
      try {
        const result = await this.session.audio.speak(text);
        if (result.error) {
          this.logger.error({ error: result.error }, `[Session ${this.sessionId}]: Error speaking text:`);
        }
      } catch (error) {
        this.logger.error(error, `[Session ${this.sessionId}]: Error speaking text:`);
      }
    }
  }

  /**
   * Subscribe to transcriptions if not already subscribed.
   */
  public ensureTranscriptionSubscribed(): void {
    if (this.transcriptionUnsubscribe) {
      return;
    }
    this.transcriptionUnsubscribe = this.session.events.onTranscription((transcriptionData) => {
      this.handleTranscription({
        ...transcriptionData,
        notifications: notificationsManager.getLatestNotifications(this.userId, 5)
      });
    });
  }

  /**
   * Unsubscribe from transcriptions to save battery when not needed.
   */
  public ensureTranscriptionUnsubscribed(): void {
    if (this.transcriptionUnsubscribe && !this.isListeningToQuery) {
      try {
        this.transcriptionUnsubscribe();
      } finally {
        this.transcriptionUnsubscribe = undefined;
      }
    }
  }

  /**
   * Remove the wake word from the input text
   */
  private removeWakeWord(text: string): string {
    // Debug: log original text
    const originalText = text;
    
    // Escape each wake word for regex special characters
    const escapedWakeWords = explicitWakeWords.map(word =>
      word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    // Build patterns that allow for spaces, commas, or periods between the words
    const wakePatterns = escapedWakeWords.map(word =>
      word.split(' ').join('[\\s,\\.]*')
    );
    // Create a regex that removes everything from the start until (and including) a wake word
    const wakeRegex = new RegExp(`^.*?(?:${wakePatterns.join('|')})[\\s,\\.!]*`, 'i');
    const result = text.replace(wakeRegex, '').trim();
    
    // Safety check: if the result is empty but original text wasn't empty, return original
    if (result.length === 0 && originalText.trim().length > 0) {
      logger.warn(`[removeWakeWord] Wake word removal resulted in empty string, returning original`);
      return originalText.trim();
    }
    
    // Debug logging
    if (originalText !== result) {
      logger.debug(`[removeWakeWord] Original: "${originalText}" -> Result: "${result}"`);
      logger.debug(`[removeWakeWord] Regex pattern: ${wakeRegex.source}`);
    }
    
    return result;
  }

  /**
   * Check if text ends with a wake word
   */
  private endsWithWakeWord(text: string): boolean {
    // Remove trailing punctuation and whitespace, lowercase
    const cleanedText = text
      .toLowerCase()
      .replace(/[.,!?;:]/g, '') // remove all punctuation
      .replace(/\s+/g, ' ')     // normalize whitespace
      .trim();
    return explicitWakeWords.some(word => {
      // Build a regex to match the wake word at the end, allowing for punctuation/whitespace
      const pattern = new RegExp(`${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
      return pattern.test(cleanedText);
    });
  }

  /**
   * Clean up resources when the session ends
   */
  cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    // Clear the maximum listening timer
    if (this.maxListeningTimeoutId) {
      clearTimeout(this.maxListeningTimeoutId);
    }

  }
}

// Utility to clean and convert ws(s)://.../tpa-ws to https://... for API calls
function getCleanServerUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  // Remove ws:// or wss://
  let url = rawUrl.replace(/^wss?:\/\//, '');
  // Remove trailing /tpa-ws
  url = url.replace(/\/app-ws$/, '');
  // Prepend https://
  return `https://${url}`;
}

/**
 * Main Mira TPA server class
 */
class MiraServer extends AppServer {
  private transcriptionManagers = new Map<string, TranscriptionManager>();
  private agentPerSession = new Map<string, MiraAgent>();

  /**
   * Handle new session connections
   */
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    const logger = session.logger.child({ service: 'Mira.MiraServer' });
    logger.info(`Setting up Mira service for session ${sessionId}, user ${userId}`);

    const cleanServerUrl = getCleanServerUrl(session.getServerUrl());
    const agent = new MiraAgent(cleanServerUrl, userId, session);
    // Start fetching tools asynchronously without blocking
    getAllToolsForUser(cleanServerUrl, userId).then(tools => {
      // Append tools to agent when they're available
      if (tools.length > 0) {
        agent.agentTools.push(...tools);
        logger.info(`Added ${tools.length} user tools to agent for user ${userId}`);
      }
    }).catch(error => {
      logger.error(error, `Failed to load tools for user ${userId}:`);
    });
    this.agentPerSession.set(sessionId, agent);

    // Create transcription manager for this session
    const transcriptionManager = new TranscriptionManager(
      session, sessionId, userId, agent, cleanServerUrl
    );
    this.transcriptionManagers.set(sessionId, transcriptionManager);

    // Welcome message
    // session.layouts.showReferenceCard(
    //   "Mira AI",
    //   "Virtual assistant connected",
    //   { durationMs: 3000 }
    // );

    // Do not subscribe globally to transcription in head-up mode.
    // Each TranscriptionManager manages its own subscription to save battery.

    // Handle head position changes (used for optional head-up wake window)
    session.events.onHeadPosition((headPositionData) => {
      const transcriptionManager = this.transcriptionManagers.get(sessionId);
      transcriptionManager?.handleHeadPosition(headPositionData);
    });

    // Subscribe to button presses
    session.events.onButtonPress?.((buttonData: any) => {
      logger.info(`[Session ${sessionId}] Button press:`, buttonData);
    });

    // Subscribe to glasses battery updates
    session.events.onGlassesBattery((batteryData: any) => {
      logger.info(`[Session ${sessionId}] Glasses battery update:`, batteryData);
    });

    // Subscribe to phone battery updates
    session.events.onPhoneBattery((batteryData: any) => {
      logger.info(`[Session ${sessionId}] Phone battery update:`, batteryData);
    });

    // Subscribe to glasses connection state (if supported by SDK)
    session.events.on?.("glassesConnectionState", (state: any) => {
      logger.info(`[Session ${sessionId}] Glasses connection state:`, state);
    });

    // Subscribe to voice activity detection
    session.events.onVoiceActivity?.((vad: any) => {
      logger.info(`[Session ${sessionId}] Voice activity detected:`, vad);
    });

    // Subscribe to notification dismissed
    session.events.onPhoneNotificationDismissed?.((dismissed: any) => {
      logger.info(`[Session ${sessionId}] Notification dismissed:`, dismissed);
    });

    // Subscribe to raw audio chunks
    session.events.onAudioChunk?.((chunk: any) => {
      logger.debug(`[Session ${sessionId}] Received audio chunk:`, chunk);
    });

    // Subscribe to translations
    // Note: SDK does not expose a direct onTranslation method, use generic handler if needed
    /*
    import { StreamType } from "@mentra/sdk";
    session.events.on(StreamType.TRANSLATION, (translation: any) => {
      logger.info(`[Session ${sessionId}] Translation:`, translation);
    });
    */

    // Also listen for setting changes to update subscription strategy dynamically
    session.settings.onChange((settings) => {
      try {
        const manager = this.transcriptionManagers.get(sessionId);
        if (manager) {
          // Reinitialize transcription subscription with new settings
          manager.initTranscriptionSubscription();
          
          // Log settings change for debugging
          session.logger.info('Settings changed, reinitializing transcription subscription');
        }
      } catch (error) {
        session.logger.error(error, 'Error handling settings change');
        // Don't crash - just log the error and continue
      }
    });
    /*
    session.events.onLocation((locationData) => {
      const transcriptionManager = this.transcriptionManagers.get(sessionId);
      if (transcriptionManager) {
        transcriptionManager.handleLocation(locationData);
      }
    });
    */

    session.events.onPhoneNotifications((phoneNotifications) => {
      this.handlePhoneNotifications(phoneNotifications, sessionId, userId);
    });

    // Handle connection events
    /*
    session.events.onConnected((settings) => {
      logger.info(`\n[User ${userId}] connected to augmentos-cloud\n`);
    });
    */

    // Handle errors
    session.events.onError((error) => {
      logger.error(error, `[User ${userId}] Error: session error occurred`);
    });
  }

  private handlePhoneNotifications(phoneNotifications: any, sessionId: string, userId: string): void {
    // Save notifications for the user
    if (Array.isArray(phoneNotifications)) {
      notificationsManager.addNotifications(userId, phoneNotifications);
    } else if (phoneNotifications) {
      notificationsManager.addNotifications(userId, [phoneNotifications]);
    }
    // No need to update agent context here; notifications will be passed in userContext when needed
  }

  // Handle tool calls from Mira AI
  protected async onToolCall(toolCall: ToolCall): Promise<string | undefined> {
    const { toolId, userId, toolParameters } = toolCall;
    
    logger.info(`Tool called: ${toolId} by user: ${userId}`);
    logger.info(`Parameters: ${JSON.stringify(toolParameters)}`);

    try {
      // Get the agent for this user (from any session)
      let agent: MiraAgent | undefined;
      
      // Try to find an agent from active sessions for this user
      for (const [sessionId, sessionAgent] of this.agentPerSession.entries()) {
        if (sessionId.includes(userId)) {
          agent = sessionAgent;
          break;
        }
      }

      // If no active session, create a temporary agent for the tool call
      if (!agent) {
        const cleanServerUrl = process.env.SERVER_URL || '';
        agent = new MiraAgent(cleanServerUrl, userId);
      }

      switch (toolId) {
        case 'web_search':
          return await this.handleWebSearch(toolParameters, agent);
        
        case 'list_available_apps':
          return await this.handleListApps(toolParameters, agent, userId);
          
        case 'control_app':
          return await this.handleControlApp(toolParameters, agent, userId);
          
        case 'calculate':
          return await this.handleCalculate(toolParameters, agent);
          
        case 'get_news_summary':
          return await this.handleNewsAPI(toolParameters, userId);
          
        case 'analyze_notifications':
          return await this.handleNotificationAnalysis(toolParameters, userId);
          
        default:
          logger.warn(`Unknown tool: ${toolId}`);
          return `Unknown tool: ${toolId}`;
      }
    } catch (error) {
      logger.error(error, `Error handling tool call ${toolId}:`);
      return `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleWebSearch(parameters: any, agent: MiraAgent): Promise<string> {
    const searchTool = agent.agentTools.find(tool => tool.name === 'Search_Engine');
    if (!searchTool) {
      return 'Search functionality not available';
    }
    
    try {
      // Add timeout for search operations
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), 10000)
      );
      
      const result = await Promise.race([
        (searchTool as any).invoke({
          searchKeyword: parameters.query,
          location: parameters.location || undefined
        }),
        timeoutPromise
      ]);
      
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
      logger.error(error, 'Search operation failed:');
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleListApps(parameters: any, agent: MiraAgent, userId: string): Promise<string> {
    const listAppsTool = agent.agentTools.find(tool => tool.name === 'TPA_ListApps');
    if (!listAppsTool) {
      return 'App listing functionality not available';
    }
    
    const result = await (listAppsTool as any).invoke({
      includeRunning: parameters.include_running || false
    });
    
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  private async handleControlApp(parameters: any, agent: MiraAgent, userId: string): Promise<string> {
    const controlAppTool = agent.agentTools.find(tool => tool.name === 'TPA_Commands');
    if (!controlAppTool) {
      return 'App control functionality not available';
    }
    
    const result = await (controlAppTool as any).invoke({
      action: parameters.action,
      packageName: parameters.packageName
    });
    
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  private async handleCalculate(parameters: any, agent: MiraAgent): Promise<string> {
    const calculatorTool = agent.agentTools.find(tool => tool.name === 'calculator');
    if (!calculatorTool) {
      return 'Calculator functionality not available';
    }
    
    const result = await (calculatorTool as any).invoke({
      input: parameters.expression
    });
    
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  private async handleNewsAPI(parameters: any, userId: string): Promise<string> {
    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('News fetch timeout')), 15000)
      );
      
      const newsAgent = new NewsAgent();
      const result = await Promise.race([
        newsAgent.handleContext({}),
        timeoutPromise
      ]);
      
      if (result && result.news_summaries && Array.isArray(result.news_summaries)) {
        if (result.news_summaries.length === 0) {
          return 'No news articles available at this time';
        }
        
        // Format the summaries as a readable list
        const formattedSummaries = result.news_summaries
          .slice(0, 5) // Limit to 5 news items for smart glasses display
          .map((summary: string, index: number) => `${index + 1}. ${summary}`)
          .join('\n');
          
        return `Latest Tech News:\n${formattedSummaries}`;
      }
      
      return 'Unable to fetch news summaries';
    } catch (error) {
      logger.error(error, `Error in handleNewsAPI:`);
      return `Error fetching news: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleNotificationAnalysis(parameters: any, userId: string): Promise<string> {
    try {
      // Get the latest notifications for this user
      const notifications = notificationsManager.getLatestNotifications(userId, 10);
      
      if (!notifications || notifications.length === 0) {
        return 'No notifications available to analyze';
      }
      
      const filterAgent = new NotificationFilterAgent();
      const result = await filterAgent.handleContext({ notifications });
      
      if (Array.isArray(result) && result.length > 0) {
        const maxNotifications = parameters.max_notifications || 5;
        const topNotifications = result
          .slice(0, maxNotifications)
          .map((notif: any, index: number) => 
            `${index + 1}. ${notif.summary} (${notif.appName})`
          )
          .join('\n');
          
        return `Important Notifications:\n${topNotifications}`;
      }
      
      return 'No important notifications found';
    } catch (error) {
      logger.error(error, `Error in handleNotificationAnalysis:`);
      return `Error analyzing notifications: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // Handle session disconnection
  protected onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    logger.info(`Stopping Mira service for session ${sessionId}, user ${userId}`);
    const manager = this.transcriptionManagers.get(sessionId);
    if (manager) {
      manager.cleanup();
      this.transcriptionManagers.delete(sessionId);
    }
    this.agentPerSession.delete(sessionId);
    return Promise.resolve();
  }
}

// Create and start the server
const server = new MiraServer({
  packageName: PACKAGE_NAME!,
  apiKey: AUGMENTOS_API_KEY!,
  port: PORT,
  webhookPath: '/webhook',
  publicDir: path.join(__dirname, './public'),
  healthCheck: true // Enable built-in health check endpoint
});

server.start()
  .then(() => {
    logger.info(`${PACKAGE_NAME} server running`);
  })
  .catch(error => {
    logger.error(error, 'Failed to start server:');
  });


// Log any unhandled promise rejections or uncaught exceptions to help with debugging.
process.on('uncaughtException', (error) => {
  logger.error(error, '🥲 Uncaught Exception:');
  // Log the error, clean up resources, then exit gracefully
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason === "Photo request timed out") {
    return logger.warn("Photo request timed out, ignoring.");
  } else if (reason === "Location poll request timed out") {
    return logger.warn("Location poll request timed out, ignoring.");
  } else {
    logger.error({ reason, promise }, '🥲 Unhandled Rejection at:');
  }
  //process.exit(1);
});
