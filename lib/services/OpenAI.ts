import OpenAI from 'openai';

class OpenAIService {
  private static openAI = new OpenAI({
    apiKey: process.env.OPEN_AI_SECRET_KEY
  });

  static async getPricesAndCategory(priceTagImageURL: string) {
    try {
      const response = await this.openAI.chat.completions.create({
        model: process.env.OPEN_AI_PRODUCT_PRICE_MODEL || 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'From this price tag image, get me the old price, old quantity and new price, new quantity if old quantity is not mentioned explicitly consider it as 1.Also get me product category And provide the output in the format of array like' +
                  'old price, old quantity, new price, new quantity, product category just numbers except for product category . Please never give output in text as description. Give only as numbers as requested strictly except for product category'  },
              {
                type: 'image_url',
                image_url: {
                  'url': priceTagImageURL
                },
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 256,
      });
      return response.choices[0].message.content?.split(',');
    } catch (error) {
      console.error('getPrices-error', error);
      throw error;
    }
  }

  static async getProductNames(priceTagImageURL: string, productImageURL: string) {
    try {
      const response = await this.openAI.chat.completions.create({
        model: process.env.OPEN_AI_PRODUCT_NAME_MODEL || 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What are the different product names from these price-tag and product images. Please give only product names comma seperated, since I will be directly storing into the database' },
              {
                type: 'image_url',
                image_url: {
                  'url': priceTagImageURL
                },
              },
              {
                type: 'image_url',
                image_url: {
                  'url': productImageURL
                },
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 256,
        seed: 50500
      });
      return response.choices[0].message.content?.split(',');
    } catch (error) {
      console.error('getProductNames-error', error);
      throw error;
    }
  }

  static async getValidProductName(detectedProductNames: string[], postProductName: string) {
    detectedProductNames = detectedProductNames.map(name => name.toUpperCase());
    try {
      const response = await this.openAI.chat.completions.create({
        model: process.env.OPEN_AI_VALID_PRODUCT_NAME || 'gpt-3.5-turbo-0125',
        messages: [
          {
            'role': 'system',
            'content': "Do Fuzzy matching of entered text on array of detected texts. Also, just give the product name do not include anything like MATCHING PRODUCT NAME: since I will store this directly into database . If no matching product name found, please return 'NULL'"
          },
          {
            'role': 'user',
            'content': `Detected Texts: ${detectedProductNames.join(',')}\n\nEntered Text: ${postProductName.toUpperCase()}}`
          },
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        seed: 1250
      });

      const { content } = response.choices[0].message;
      if (!content || content === 'NULL')
        return null;
      return content.toUpperCase();
    } catch (error) {
      console.error('getValidProductName-error', error);
      throw error;
    }
  }
}

export {
  OpenAIService
};