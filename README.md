# Blood Donation Request System

A web application that allows users to submit blood donation requests and track their status in real-time. The system includes an admin dashboard for monitoring and managing blood requests.

## Features

- **User Authentication**: Secure login with Google
- **Blood Request Form**: Submit requests with details about patient, blood group, and urgency
- **Real-time Status Tracking**: Track request status with animated progress indicators
- **Admin Dashboard**: Monitor all requests, filter by blood group and urgency, and update request status
- **Responsive Design**: Works on desktop and mobile devices

## Pages

1. **Login Page**: Authentication with Google
2. **Request Page**: Form to submit blood donation requests
3. **Status Page**: Real-time tracking of request status with detailed history
4. **Admin Dashboard**: Comprehensive view of all requests with filtering and status management

## Setup Instructions

### Prerequisites

- A Firebase account (for authentication and database)

### Firebase Setup

1. Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Google Authentication:
   - Go to Authentication > Sign-in method
   - Enable Google as a sign-in provider
3. Create a Firestore Database:
   - Go to Firestore Database > Create database
   - Start in test mode for development
4. Get your Firebase configuration:
   - Go to Project settings > General > Your apps
   - Register a web app if you haven't already
   - Copy the Firebase configuration object

### Application Setup

1. Clone or download this repository
2. Replace the Firebase configuration in `firebase-config.js` with your own:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```
3. Add admin email addresses in the `isAdmin()` function in `firebase-config.js`
4. Open `index.html` in your browser or deploy to a web server

## Deployment

You can deploy this application to Firebase Hosting:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize your project: `firebase init`
4. Select Hosting and your Firebase project
5. Deploy: `firebase deploy`

## Data Structure

The application uses Firestore with the following structure:

- Collection: `bloodRequests`
  - Document: `[auto-generated-id]`
    - `userId`: User's Firebase UID
    - `userEmail`: User's email
    - `patientName`: Patient's name
    - `bloodGroup`: Blood group required
    - `units`: Number of units required
    - `hospital`: Hospital name
    - `address`: Hospital address
    - `contactNumber`: Contact number
    - `urgency`: Urgency level (high, medium, low)
    - `additionalInfo`: Additional information
    - `createdAt`: Timestamp
    - `status`: Current status (submitted, verified, searching, found, delivered)
    - `statusHistory`: Array of status updates with comments and timestamps

## License

This project is available under the MIT License.

## Support

For issues or questions, please open an issue on the repository. 