import * as vscode from 'vscode';
import axios from 'axios';
import OpenAI from "openai";

const {Translate} = require('@google-cloud/translate').v2;

export function activate(context: vscode.ExtensionContext) {
    console.log('Translation and validation extension is now active!');

    let disposable = vscode.commands.registerCommand('extension.translateAndValidateCommitMessage', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor!');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        try {
            const translatedText = await translateCommitMessage(text);
            const validationResponse = await validateTranslation(translatedText);

            vscode.window.showInformationMessage(`Translated commit message: ${translatedText}`);
            vscode.window.showInformationMessage(`Validation result: ${validationResponse}`);
        } catch (error) {
            if (error instanceof Error && error.message) {
                vscode.window.showErrorMessage(`Translation and validation failed: ${error.message}`);
            } else {
                console.error(error);
            }
        }
    });

    context.subscriptions.push(disposable);
}

async function translateCommitMessage(text: string): Promise<string> {
    const googleProjectId = 'YOUR_PROJECT_ID';
    const apiKey = 'YOUR_TRANSLATION_API_KEY'; // filepath
    const url = 'https://translation.googleapis.com/language/translate/v2';
    const translate = new Translate({
        projectId: googleProjectId,
        keyFilename: apiKey
      });

    try {
        const [translatedText] = await translate.translate(text, 'en');
        return translatedText;
        // const response = await axios.post(url, {
        //     q: text,
        //     source: 'ru',
        //     target: 'en',
        //     key: apiKey
        // });
        //
        // return response.data.data.translations[0].translatedText;
    } catch (error) {
        if (error instanceof axios.AxiosError && error.response) {
            throw new Error(error.response.data.error.message);
        } else {
            throw error;
        }
    }
}

async function validateTranslation(text: string): Promise<string> {
    const openai = new OpenAI({
        organization: 'YOUR_ORG_ID',
        project: '$PROJECT_ID',
    });

    try {

        const response = await openai.completions.create({
            model: 'gpt-3.5-turbo-instruct',
            prompt: `Validate the following commit message: ${text}`,
            temperature: 0.7,
          });
          return response.choices[0].text;

        /*openai.completions.create({
            model: 'gpt-3.5-turbo-instruct',
            prompt: `Validate the following commit message: ${text}`,
            temperature: 0.7,
        }).then((response) => {
            return response.choices[0].text;
        }).catch((error) => {
            if (error instanceof Error && error.message) {
                throw new Error(error.message);
            } else {
                throw error;
            }
        });
        */
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
