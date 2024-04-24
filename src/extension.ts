import * as vscode from 'vscode';
import axios from 'axios';
import OpenAI from "openai";
import dotenv from 'dotenv'; 

export function activate(context: vscode.ExtensionContext) {
    console.log('Translation and validation extension is now active!');
    dotenv.config();

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
            translatedText = await translateMessage(text);
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
            var validationResponse = await validateTranslation(text, translatedText);
            vscode.window.showInformationMessage(`Validation result: ${validationResponse}`);
        } catch (error) {
            if (error instanceof Error && error.message) {
                vscode.window.showErrorMessage(`Validation failed: ${error.message}`);
            } else {
                console.error(error);
            }
        }
    });

    context.subscriptions.push(disposable);
}

async function translateMessage(text: string): Promise<string> {
    const url = 'https://translate.api.cloud.yandex.net/translate/v2/translate';
    const token = process.env.YANDEX_API_KEY;
    const headers = {
        'Authorization': `Api-Key ${token}`,
        'Content-Type': 'application/json'
    };

    const requestBody = {
        "targetLanguageCode": "en",
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

async function validateTranslation(text: string, translatedText: string): Promise<string> {
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

export function deactivate() {
}
