const vscode = require('vscode');
const axios = require('axios');
axios.defaults.timeout = 300000; 

function activate(context) {
    // Register command to configure API key
    let setApiKeyCommand = vscode.commands.registerCommand('html-email-preview.setApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({ prompt: "Enter your API Key" });
        await vscode.workspace.getConfiguration('html-email-preview').update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
    });

    // Register command to fetch devices
	let fetchDevicesCommand = vscode.commands.registerCommand('html-email-preview.fetchDevices', async () => {
		const devices = await fetchDevices();
		// Optionally display the devices or log them
		console.log(devices);
	
		// Check if devices is not empty
		if (devices.length === 0) {
			vscode.window.showInformationMessage("No devices found or unable to fetch devices.");
			return;
		}
	
		vscode.window.showQuickPick(
			devices.map(device => ({
				label: device.name,
				description: device.category,
				deviceKey: device.deviceKey // Storing deviceKey in the item
			})),
			{ canPickMany: false, placeHolder: 'Select a device for the preview' } // Changed canPickMany to false and adjusted the placeholder text
		).then(selectedDevice => {
			if (selectedDevice) {
				console.log("Selected device:", selectedDevice.deviceKey); // Log selected deviceKey
				showPreviewForm([selectedDevice].map(device => ({
					name: device.label,
					category: device.description,
					deviceKey: device.deviceKey
				}))); // Pass selectedDevice as an array to match the expected format
			}
		});
	});
	
	

    // Add to context subscriptions
    context.subscriptions.push(setApiKeyCommand, fetchDevicesCommand);
}

async function fetchDevices() {
    const apiKey = vscode.workspace.getConfiguration('html-email-preview').get('apiKey');
    if (!apiKey) {
        vscode.window.showInformationMessage('API Key is not set. Please set your API Key first.');
        return [];  // Return an empty array immediately if no API key is set.
    }

    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Loading preview devices...",
        cancellable: false
    }, async (progress) => {
        try {
            const response = await axios.get('https://emailpreview.h501.io/devices', {
                headers: {'X-API-KEY': apiKey.trim()} // Correct handling of API key with trim.
            });
            return response.data; // axios automatically handles JSON parsing, ensure this is an array.
        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching devices: ${error.message}`);
            return [];  // Return an empty array on error.
        }
    });
}


function showPreviewForm(selectedDevices) {
    vscode.window.showInputBox({ prompt: "Enter Email Subject" }).then(subject => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === "html") {
            const htmlContent = editor.document.getText();
            sendPreviewRequest(htmlContent, subject, selectedDevices);
        } else {
            vscode.window.showErrorMessage('No active HTML editor. Please open an HTML file to use this extension.');
        }
    });
}

async function sendPreviewRequest(htmlContent, subject, selectedDevices) {
    const apiKey = vscode.workspace.getConfiguration('html-email-preview').get('apiKey');
    const deviceKeys = selectedDevices.map(device => device.deviceKey);
    const panel = vscode.window.createWebviewPanel('emailPreview', 'Email Preview', vscode.ViewColumn.Two, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.parse('https://emailpreview.h501.io')]
    });

    // Set initial content with a loader
    panel.webview.html = getLoadingScreen();
    try {

        const response = await axios.post('https://emailpreview.h501.io/sendPreview', {
            htmlBody: htmlContent,
            emailSubject: subject,
            devices: deviceKeys,
        }, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
			timeout: 300000
        });

        displayPreview(response.data, panel); // Pass the panel to reuse

    } catch (error) {

        vscode.window.showErrorMessage(`Error sending preview request: ${error.message}`);
        panel.dispose(); // Close the panel if there's an error
    }
}


function getLoadingScreen() {
    return `
        <html>
        <head>
            <style>
                .loader {
                    border: 16px solid #f3f3f3; /* Light grey */
                    border-top: 16px solid #3498db; /* Blue */
                    border-radius: 50%;
                    width: 120px;
                    height: 120px;
                    animation: spin 2s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                body {display: flex; justify-content: center; align-items: center; height: 100vh;}
            </style>
        </head>
        <body>
            <div class="loader"></div>
        </body>
        </html>
    `;
}


function displayPreview(previewData, panel) {
    let htmlContent = `<html><head><style>img{width: 100%; height: auto;}</style></head><body>`;
    previewData.forEach(preview => {
        // Remove backslashes and handle already complete URLs or relative paths
        let correctedUrl = preview.newImageUrl.replace(/\\/g, ''); // Remove backslashes

        // Check if the URL already includes the domain
        if (!correctedUrl.startsWith('http')) {
            correctedUrl = correctedUrl.replace(/^\.\//, ''); // Remove leading './' if present
            correctedUrl = new URL(correctedUrl, 'https://emailpreview.h501.io').href;
        } else {
            // If it's a complete URL, use it as is
            correctedUrl = new URL(correctedUrl).href;
        }

        // Ensuring the image URL is properly parsed as a VS Code URI
        const imageUri = panel.webview.asWebviewUri(vscode.Uri.parse(correctedUrl));

        htmlContent += `<div><h3>${preview.deviceKey}</h3><img src="${imageUri}" /></div>`;
    });
    htmlContent += `</body></html>`;
    panel.webview.html = htmlContent;
}






function deactivate() {
    // Clean up if necessary
}

module.exports = {
    activate,
    deactivate
};