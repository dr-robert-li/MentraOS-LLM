// SearchTool.ts

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Get Jina API key from environment
// Get your Jina AI API key for free: https://jina.ai/?sui=apikey
export const JINA_API_KEY = process.env.JINA_API_KEY || "";

// Define the input schema using zod
const SearchInputSchema = z.object({
  searchKeyword: z.string().describe('The search query or keywords to search for'),
  location: z.string().optional().describe('Optional city-level location context for the search, if known, as "city, state code"'),
});

// Type for the search input based on the schema
type SearchInput = z.infer<typeof SearchInputSchema>;

/**
 * SearchToolForAgents is a StructuredTool that searches the web using Jina AI's search API.
 * It provides LLM-friendly search results for any query.
 *
 * To call this tool, pass an object with the following format:
 * {
 *   "searchKeyword": "your search query",
 *   "location": "San Francisco, CA"  // optional
 * }
 *
 * The tool returns LLM-friendly search results as a text string.
 */
export class SearchToolForAgents extends StructuredTool<any> {
  name = 'Search_Engine';
  description = 'Searches the web for information about a given query using Jina AI. Pass specific queries and/or keywords to quickly search the web and retrieve information on any topic like academic research, history, entertainment, current events. This tool does NOT work for personal information and does NOT work for math. Input: { "searchKeyword": string, "location"?: string }';
  schema = SearchInputSchema;

  constructor() {
    super();
    if (!JINA_API_KEY) {
      console.warn('JINA_API_KEY is not set. Search functionality may not work.');
    }
  }

  /**
   * Searches the web using Jina AI's search API
   * @param input - Object with searchKeyword (required) and location (optional)
   * @returns Promise<string> - The LLM-friendly search results from Jina
   */
  async _call(input: SearchInput): Promise<string> {
    const { searchKeyword, location } = input;

    // Validate that we have an API key
    if (!JINA_API_KEY) {
      return 'Error: JINA_API_KEY is not configured. Please set the JINA_API_KEY environment variable. Get your Jina AI API key for free: https://jina.ai/?sui=apikey';
    }

    try {
      // Build the search URL
      const searchParams = new URLSearchParams();
      searchParams.append('q', searchKeyword);

      // Add location if provided
      if (location && location.trim() !== '') {
        searchParams.append('location', location.trim());
      }

      const searchUrl = `https://s.jina.ai/?${searchParams.toString()}`;

      console.log(`[SearchToolForAgents] Searching: ${searchUrl}`);

      // Make the API call with required headers
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${JINA_API_KEY}`,
          'X-Engine': 'direct',
          'X-Retain-Images': 'none',
          'X-Timeout': '5'
        }
      });

      if (!response.ok) {
        throw new Error(`Jina API responded with status ${response.status}: ${response.statusText}`);
      }

      // Get the response text (Jina returns LLM-friendly content)
      const responseText = await response.text();

      if (!responseText || responseText.trim() === '') {
        return `No search results found for "${searchKeyword}".`;
      }

      console.log(`[SearchToolForAgents] Search completed for: ${searchKeyword}`);

      // Return the raw response from Jina (already LLM-friendly)
      return responseText;

    } catch (error) {
      console.error(`Error during Jina search for "${searchKeyword}":`, error);
      return `Error occurred while searching for "${searchKeyword}": ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}
