/**
 * LLM API 配置
 * 支持 OpenAI, SiliconFlow, Ollama 三种提供商
 */

const llmConfig = {
  // API 提供商: 'openai', 'siliconflow', 'ollama'
  provider: process.env.LLM_API_PROVIDER || 'openai',
  
  // OpenAI 配置
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    endpoint: 'https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
    maxTokens: 100,
  },
  
  // SiliconFlow 配置
  siliconflow: {
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    model: process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3',
    maxTokens: 100,
  },
  
  // Ollama 配置
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen3:8b',
    endpoint: '/api/generate',
    maxTokens: 100,
    timeout: 30000, // 30秒超时
  },
};

/**
 * 获取当前配置的 LLM 提供商信息
 */
function getLLMConfig() {
  const provider = llmConfig.provider;
  const config = {
    provider: provider,
    ...llmConfig[provider],
  };
  
  return config;
}

/**
 * 验证配置是否完整
 */
function validateConfig() {
  const provider = llmConfig.provider;
  const config = llmConfig[provider];
  
  if (provider === 'openai') {
    if (!config.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
  } else if (provider === 'siliconflow') {
    if (!config.apiKey) {
      throw new Error('SILICONFLOW_API_KEY environment variable is not set');
    }
  } else if (provider === 'ollama') {
    // Ollama 不需要 API key，但需要确保服务运行
    // 这里不验证，让调用时处理错误
  } else {
    throw new Error(`Unknown LLM provider: ${provider}`);
  }
  
  return true;
}

module.exports = {
  llmConfig,
  getLLMConfig,
  validateConfig,
};

