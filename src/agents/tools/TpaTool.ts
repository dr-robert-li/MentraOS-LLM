import { DynamicStructuredTool, DynamicTool, StructuredTool } from '@langchain/core/tools';
import { z } from "zod";
import { ToolSchema, ToolCall, ToolParameterSchema } from '@augmentos/sdk';
import axios, { AxiosError } from 'axios';


/**
 * Fetches all available tools for a specified package from the cloud service.
 *
 * @param cloudUrl - The URL of the cloud service
 * @param tpaPackageName - The name of the third-party application package
 * @returns A promise that resolves to an array of tool schemas
 * @throws AxiosError if the network request fails
 */

export async function getAllToolsForPackage(cloudUrl: string, tpaPackageName: string, actingUserId: string): Promise<DynamicTool[]> {
  // Get the tools from the cloud
  const urlToGetTools = `${cloudUrl}/api/tools/apps/${tpaPackageName}/tools`;
  const response = await axios.get<ToolSchema[]>(urlToGetTools);
  const toolSchemas = response.data;

  // log tools
  for (const toolSchema of toolSchemas) {
    console.log(`Found tool: ${toolSchema.id}: ${toolSchema.description}`);
  }

  // Compile the tools
  const tools = toolSchemas.map(toolSchema => compileTool(cloudUrl, tpaPackageName, toolSchema, actingUserId));
  return tools;
}

export function compileTool(cloudUrl: string, tpaPackageName: string, tpaTool: ToolSchema, _actingUserId: string): DynamicTool {

  let description = tpaTool.description;
  if (tpaTool.activationPhrases && tpaTool.activationPhrases.length > 0) {
    description += "\nPossibly activated by phrases like: " + tpaTool.activationPhrases?.join(', ')
  }

  return new DynamicTool({
    name: tpaTool.id,
    description: description,
    func: async (input: string): Promise<string> => {
      // Construct the webhook URL for the TPA tool
      const webhookUrl = cloudUrl + `/api/tools/apps/${tpaPackageName}/tool`;

      // Prepare the payload with the input parameters
      // For DynamicTool, input is always a string, so we'll parse it as JSON if possible
      let params: any = {};
      if (input && input.trim()) {
        try {
          params = JSON.parse(input);
        } catch {
          // If not valid JSON, use the input as-is
          params = { input: input };
        }
      }
      const payload: ToolCall = {
        toolId: tpaTool.id,
        toolParameters: params
      }
      console.log(`[toolcall] Sending request to ${tpaTool.id} with params: ${JSON.stringify(params)}`);
      try {
        // Send the request to the TPA webhook with a 40-second timeout
        const response = await axios.post(webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 40000 // 10 second timeout for the request
        });
        console.log(`[toolcall] Response from ${tpaTool.id}: ${JSON.stringify(response.data)}`);
        // Return the successful response data
        return response.data;
      } catch (error) {
        // Handle Axios errors (including timeouts)
        if (axios.isAxiosError(error)) {
          // Check if it's a timeout error
          if (error.code === 'ECONNABORTED') {
            console.error(`[toolcall] TPA tool request timed out for ${tpaTool.id}`);
            return `The request to ${tpaTool.id} timed out after 10 seconds. Please try again later.`;
          }

          // Handle other Axios errors
          console.error(`[toolcall] TPA tool request failed for ${tpaTool.id}: ${error.message}`);
          console.error(`[toolcall] Status: ${error.response?.status}`);
          console.error(`[toolcall] Response: ${JSON.stringify(error.response?.data)}`);

          return `Error executing ${tpaTool.id}: ${error.message}`;
        } else {
          // Handle non-Axios errors
          const genericError = error as Error;
          console.error(`[toolcall] TPA tool execution error: ${genericError.message}`);
          return `Error executing ${tpaTool.id}: ${genericError.message || 'Unknown error'}`;
        }
      }
    }
  });
}

/**
 * Gets all installed apps for a user and retrieves all tools for each app.
 * This function requires proper authentication to be set up before calling.
 *
 * @returns A promise that resolves to an array of tools from all installed apps
 * @throws Error if authentication fails or if there are issues fetching apps/tools
 */
export async function getAllToolsForUser(cloudUrl: string, userId: string): Promise<DynamicTool[]> {
  try {
    // Construct the URL to get all tools for the user
    const urlToGetUserTools = `${cloudUrl}/api/tools/users/${userId}/tools`;

    // Make the request to get all tools for the user
    const response = await axios.get<Array<ToolSchema & { appPackageName: string }>>(urlToGetUserTools);
    const userTools = response.data;

    // Log the tools found for the user
    console.log(`Found ${userTools.length} tools for user ${userId}`);

    // Compile all tools from all the user's installed apps
    const tools: DynamicTool[] = [];

    for (const toolSchema of userTools) {
      console.log(`Processing tool: ${toolSchema.id} from app: ${toolSchema.appPackageName}`);

      // Compile each tool with its associated package name
      const compiledTool = compileTool(cloudUrl, toolSchema.appPackageName, toolSchema, userId);
      tools.push(compiledTool);
    }

    return tools;
  } catch (error) {
    // Handle errors appropriately
    if (axios.isAxiosError(error)) {
      console.error(`Failed to fetch tools for user ${userId}: ${error.message}`);
      console.error(`Status: ${error.response?.status}`);
      console.error(`Response: ${JSON.stringify(error.response?.data)}`);
    } else {
      console.error(`Error getting tools for user ${userId}: ${(error as Error).message}`);
    }

    // Return empty array on error to prevent application crashes
    return [];
  }
}