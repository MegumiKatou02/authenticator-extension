# Authenticator Extension

This is a browser extension designed to generate Time-based One-Time Passwords (TOTP) for two-factor authentication (2FA). The extension helps users manage multiple 2FA tokens securely and conveniently

## Features

- Generate TOTP tokens for multiple services
- Add new tokens using a secret key
- View and copy tokens with a simple click
- Optionally, display a QR code for easy setup (future)
- Progress bar showing the remaining time for the current token
- Save tokens securely using Chrome's sync storage

## Installation

### For Developers

To run this project locally, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/MegumiKatou02/authenticator-extension.git
   ```
2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** in the top right corner

4. Click on **Load unpacked** and select the folder where you cloned the project

5. The extension will now be installed and active in your browser

### For Users
1. Download the extension from the Chrome Web Store (if available)

2. Install and follow the on-screen instructions to add and manage your 2FA tokens

## Usage
1. Click the extension icon in the browser toolbar to open the popup

2. Click on the + **Add New** button to add a new token

3. Enter the service name and secret key (or scan a QR code) to generate the TOTP token (future)

4. The generated token will be displayed with a progress bar indicating how much time is left before it expires

5. Click the **Copy** button to copy the token to the clipboard

## Contributing
Contributions are welcome! If you'd like to improve this project, please fork the repository and submit a pull request

### Steps to contribute:
1. Fork this repository.
2. Clone your fork to your local machine
3. Create a new branch for your feature or bugfix
4. Make your changes and commit them with descriptive messages
5. Push your changes to your forked repository
6. Submit a pull request to the original repository
## License
This project is licensed under the MIT License - see the [LICENSE](https://github.com/MegumiKatou02/authenticator-extension/blob/main/LICENSE) file for details

## Acknowledgments
- TOTP algorithm is based on [RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)
- HMAC-SHA1 for token generation via Web Crypto API