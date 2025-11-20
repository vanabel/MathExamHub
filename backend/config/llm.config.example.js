/**
 * LLM API 配置示例文件
 * 
 * 使用方法：
 * 1. 复制此文件为 llm.config.js（不会被 git 跟踪）
 * 2. 修改配置以匹配你的需求
 * 3. 或者直接使用环境变量（推荐）
 * 
 * 注意：此文件仅作为示例，实际配置通过环境变量或直接修改 config/llm.js
 */

module.exports = {
  // API 提供商: 'openai', 'siliconflow', 'ollama'
  provider: 'openai',
  
  // OpenAI 配置
  openai: {
    apiKey: 'your-openai-api-key-here',
    endpoint: 'https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
    maxTokens: 100,
  },
  
  // SiliconFlow 配置
  siliconflow: {
    apiKey: 'your-siliconflow-api-key-here',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'deepseek-ai/DeepSeek-V3',
    maxTokens: 100,
  },
  
  // Ollama 配置
  ollama: {
    url: 'http://localhost:11434',
    model: 'qwen3:8b',
    endpoint: '/api/generate',
    maxTokens: 100,
    timeout: 30000, // 30秒超时
  },
};

