// Geolocation Tracking Module

// Function to get current position with error handling
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                });
            },
            error => {
                let errorMessage = 'Unknown error';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'User denied the request for geolocation';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'The request to get user location timed out';
                        break;
                }
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// Function to watch position with error handling
function watchPosition(callback) {
    if (!navigator.geolocation) {
        console.error('Geolocation is not supported by your browser');
        return null;
    }
    
    return navigator.geolocation.watchPosition(
        position => {
            const locationData = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
            };
            callback(null, locationData);
        },
        error => {
            let errorMessage = 'Unknown error';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'User denied the request for geolocation';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'The request to get user location timed out';
                    break;
            }
            callback(new Error(errorMessage));
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Function to stop watching position
function clearWatch(watchId) {
    if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        return true;
    }
    return false;
}

// Function to update user location in Firestore
function updateUserLocation(userId, userType, locationData) {
    // Get a reference to the Firestore database
    const db = firebase.firestore();
    
    // Create location data with timestamp
    const locationWithTimestamp = {
        ...locationData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Update the user's location in the appropriate collection
    return db.collection(userType + 's').doc(userId).update({
        location: locationWithTimestamp,
        locationHistory: firebase.firestore.FieldValue.arrayUnion({
            ...locationData,
            timestamp: new Date().toISOString()
        })
    }).catch(error => {
        console.error('Error updating location:', error);
        throw error;
    });
}

// Function to calculate distance between two points in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Export functions
window.GeoTracking = {
    getCurrentPosition,
    watchPosition,
    clearWatch,
    updateUserLocation,
    calculateDistance
};