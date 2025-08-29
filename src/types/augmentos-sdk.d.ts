declare module "@augmentos/sdk" {
  export interface ToolParameterSchema {
    type: 'string' | 'number' | 'boolean';
    description: string;
    enum?: string[];
    required?: boolean;
  }

  export interface ToolSchema {
    id: string;
    description: string;
    activationPhrases?: string[];
    parameters?: Record<string, ToolParameterSchema>;
  }

  export interface ToolCall {
    toolId: string;
    toolParameters: any;
  }
}
