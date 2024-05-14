## Features

Preview your HTML email directly in VS Code without leaving the editor.
Choose between many devices and email clients to get an idea of how your email will actually look like.

![Device List](imgs/extension_devices.png)

![HTML Preview](imgs/extension_preview.png)

You can also use our API to get the preview, is as simple as using cURL
`
curl -X GET https://emailpreview.h501.io/devices \
-H "Content-Type: application/json" \
-H "X-API-KEY: 1234567890"

return [{
"name":"AOL Standard",
"category":"WEB",
"deviceKey":"aol_basic"
}]


curl -X POST https://emailpreview.h501.io/sendPreview \
-H "Content-Type: application/json" \
-H "X-API-KEY: 1234567890" \
-d '{"htmlBody":"<h2>Your HTML goes here</h2>","emailSubject":"Some cool stuff","devices":["microsoft_outlook_2016"]}'

return [{
"deviceKey":"aol_basic",
"newImageUrl":"https://emailpreview.h501.io/files/qj123zxxzkj342f.jpg"
}]
`

## Requirements

You need to get an API key at https://emailpreview.h501.io/

## Coming soon

Possibility to run multiple preview at once

## Release Notes

### 1.0.0

Initial release of HTML Email Preview

---

**Enjoy!**