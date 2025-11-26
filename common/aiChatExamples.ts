/**
 * AI 对话服务使用示例
 */

import { AIChatService, createAIChatConfig, ImageContent } from './aiChatService';

/**
 * 示例 1: 基础文本对话
 */
export async function basicTextChatExample() {
  const config = createAIChatConfig('OPENROUTER', 'your-api-key-here', {
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.7,
    systemPrompt: '你是一个专业的翻译助手，请将用户提供的内容翻译成通俗易懂的人话。'
  });

  const prompt = '请解释什么是"机器学习"';

  try {
    const response = await AIChatService.chatText(config, prompt, {
      onContent: (content) => {
        console.log('实时内容:', content);
      },
      onComplete: (finalContent) => {
        console.log('最终回答:', finalContent);
      },
      onError: (error) => {
        console.error('对话出错:', error);
      }
    });

    console.log('对话完成:', response);
  } catch (error) {
    console.error('请求失败:', error);
  }
}

/**
 * 示例 2: 多模态对话（文本 + 图片）
 */
export async function multimodalChatExample() {
  const config = createAIChatConfig('OPENAI', 'your-openai-key', {
    model: 'gpt-4o',
    temperature: 0.5,
    systemPrompt: '你是一个图像分析专家，可以分析图片内容并回答相关问题。'
  });

  const images: ImageContent[] = [
    {
      data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
      mimeType: 'image/jpeg',
      fileName: 'example.jpg'
    }
  ];

  const text = '请描述这张图片的内容';

  try {
    const response = await AIChatService.chatWithImages(config, text, images, {
      onContent: (content) => {
        console.log('实时分析:', content);
      },
      onComplete: (finalContent) => {
        console.log('图片分析完成:', finalContent);
      }
    });

    console.log('最终结果:', response);
  } catch (error) {
    console.error('图片分析失败:', error);
  }
}

/**
 * 示例 3: 支持思考模式的对话
 */
export async function thinkingChatExample() {
  const config = createAIChatConfig('CLAUDE', 'your-claude-key', {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    thinkingEnabled: true,
    systemPrompt: '你是一个逻辑推理专家，请详细分析问题并展示你的思考过程。'
  });

  const question = '如果一个房间里有3只猫，每只猫前面有2只猫，每只猫后面有2只猫，这个房间里一共有几只猫？';

  let reasoning = '';
  let answer = '';

  try {
    await AIChatService.chatText(config, question, {
      onContent: (content, reasoningContent) => {
        if (reasoningContent && reasoningContent !== reasoning) {
          reasoning = reasoningContent;
          console.log('思考过程:', reasoning);
        }
        if (content && content !== answer) {
          answer = content;
          console.log('答案:', answer);
        }
      },
      onComplete: (finalContent, finalReasoning) => {
        console.log('=== 最终思考过程 ===');
        console.log(finalReasoning);
        console.log('=== 最终答案 ===');
        console.log(finalContent);
      }
    });
  } catch (error) {
    console.error('推理失败:', error);
  }
}

/**
 * 示例 4: 可取消的对话
 */
export async function cancellableChatExample() {
  const config = createAIChatConfig('GEMINI', 'your-gemini-key', {
    model: 'gemini-1.5-pro',
    temperature: 0.7,
  });

  const prompt = '请写一个1000字的故事';
  const requestId = `story_${Date.now()}`;

  // 5秒后取消请求
  setTimeout(() => {
    console.log('取消对话请求...');
    AIChatService.cancelChat(requestId);
  }, 5000);

  try {
    const response = await AIChatService.chatText(config, prompt, {
      onContent: (content) => {
        console.log('故事内容:', content);
      },
      onAbort: () => {
        console.log('对话被取消');
      },
      onComplete: (finalContent) => {
        console.log('故事完成:', finalContent);
      }
    }, requestId);

    console.log('最终故事:', response);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('对话成功被取消');
    } else {
      console.error('对话出错:', error);
    }
  }
}

/**
 * 示例 5: 批量处理多个对话
 */
export async function batchChatExample() {
  const config = createAIChatConfig('OLLAMA', '', {
    baseUrl: 'http://localhost:11434/v1/chat/completions',
    model: 'llama3.1:8b',
    temperature: 0.7,
  });

  const prompts = [
    '解释什么是人工智能',
    '什么是机器学习？',
    '深度学习和机器学习的区别是什么？'
  ];

  const results = await Promise.allSettled(
    prompts.map((prompt, index) =>
      AIChatService.chatText(config, prompt, {
        onContent: (content) => {
          console.log(`问题 ${index + 1} 实时回答:`, content);
        },
        onComplete: (finalContent) => {
          console.log(`问题 ${index + 1} 完成:`, finalContent);
        }
      }, `batch_${index}`)
    )
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`问题 ${index + 1} 成功:`, result.value);
    } else {
      console.error(`问题 ${index + 1} 失败:`, result.reason);
    }
  });
}

/**
 * 示例 6: 自定义配置的对话
 */
export async function customConfigExample() {
  // 完全自定义的配置
  const customConfig = {
    apiKey: 'your-custom-api-key',
    baseUrl: 'https://your-custom-endpoint.com/v1/chat/completions',
    model: 'custom-model-name',
    temperature: 0.8,
    maxTokens: 2000,
    systemPrompt: '你是一个专业的技术顾问，请提供准确、详细的技术解答。',
    thinkingEnabled: false
  };

  const technicalQuestion = '请解释微服务架构的优缺点';

  try {
    const response = await AIChatService.chatText(customConfig, technicalQuestion, {
      onContent: (content) => {
        console.log('技术解答实时内容:', content);
      },
      onComplete: (finalContent) => {
        console.log('技术解答完成:', finalContent);
      },
      onError: (error) => {
        console.error('技术解答出错:', error);
      }
    });

    return response;
  } catch (error) {
    console.error('自定义服务请求失败:', error);
    throw error;
  }
}