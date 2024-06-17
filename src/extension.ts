import * as vscode from 'vscode';
import axios from 'axios';
import OpenAI from "openai";
import dotenv from 'dotenv';

export function activate(context: vscode.ExtensionContext) {
    console.log('Translation and validation extension is now active!');
    dotenv.config();
    const targetLanguage = vscode.workspace.getConfiguration().get('ai-translate.targetLanguage') as string;
    const yandexApiKey = vscode.workspace.getConfiguration().get('ai-translate.yandexApiKey') as string;

    let disposable = vscode.commands.registerCommand('ai-translate.translateAndValidateMessage', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor!');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text) {
            vscode.window.showErrorMessage('No text selected!');
            return;
        }

        var translatedText = "";
        try {
            translatedText = await translateMessage(text, targetLanguage, yandexApiKey);
            vscode.window.showInformationMessage(`Translated message: ${translatedText}`);
        } catch (error) {
            if (error instanceof Error && error.message) {
                vscode.window.showErrorMessage(`Translation failed: ${error.message}`);
            } else {
                console.error(error);
            }
        }
        if (translatedText == "") {
            vscode.window.showErrorMessage('No text translated!');
            return;
        }
        try {
            var validationResponse = await validateTranslationYaGPT(text, translatedText, yandexApiKey);
            vscode.window.showInformationMessage(`Yandex GPT validation result: ${validationResponse}`);
        } catch (error) {
            if (error instanceof Error && error.message) {
                vscode.window.showErrorMessage(`Yandex GPT validation failed: ${error.message}`);
            } else {
                console.error(error);
            }
        }
    });

    context.subscriptions.push(disposable);
}

async function translateMessage(text: string, targetLanguage = 'en', apiKey: string): Promise<string> {
    const url = 'https://translate.api.cloud.yandex.net/translate/v2/translate';
    const headers = {
        'Authorization': `Api-Key ${apiKey}`,
        'Content-Type': 'application/json'
    };

    const requestBody = {
        "targetLanguageCode": targetLanguage,
        "format": "PLAIN_TEXT",
        "texts": [
            text
        ]
    };

    try {
        const response = await axios.post(url, requestBody, { headers });
        const translatedText = response.data.translations[0].text;
        return translatedText;
    } catch (error) {
        if (error instanceof axios.AxiosError && error.response) {
            console.error('Error:', error.response.data);
        }
        throw new Error('Failed to translate text');
    }
}

async function validateTranslationOpenAI(text: string, translatedText: string): Promise<string> {
    const openai = new OpenAI({
        organization: process.env.OPENAI_ORGANIZATION_ID,
        project: process.env.OPENAI_PROJECT_ID,
    });

    try {
        const response = await openai.completions.create({
            model: 'gpt-3.5-turbo-instruct',
            prompt: `Validate the following translation of message ${text}: ${translatedText}. Response only with validated translation.`,
            temperature: 0.7,
        });
        return response.choices[0].text;
    } catch (error) {
        if (error instanceof axios.AxiosError && error.response) {
            throw new Error(error.response.data.error.message);
        } else {
            throw error;
        }
    }
}

async function validateTranslationYaGPT(text: string, translatedText: string, apiKey: string): Promise<string> {
    const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
    const headers = {
        'Authorization': `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'x-folder-id': 'ai.languageModels.user',
    };
    const requestBody = {
        "modelUri": "gpt://b1gvelj2kbbpnph7e7v0/yandexgpt",
        "completionOptions": {
            "stream": true,
            "temperature": 0.7,
            "maxTokens": 500
        },
        "messages": [
            {
                "role": "system",
                "text": "Проверь корректность перевода текста. В ответе укажи только текст корректного перевода."
            },
            {
                "role": "user",
                "text": `Исходный текст: "${text}". Переведенный текст: "${translatedText}".`
            }
        ]
    };
    try {
        const response = await axios.post(url, requestBody, { headers });
        const validatedText = response.data.result.alternatives[0].message.text;
        return validatedText;
    } catch (error) {
        if (error instanceof axios.AxiosError && error.response) {
            console.error('Error:', error.response.data);
        }
        throw new Error('Failed to validate text with Yandex GPT');
    }
}

export function deactivate() {
}
