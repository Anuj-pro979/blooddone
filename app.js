// DOM Elements
const googleLoginBtn = document.getElementById('googleLogin');
const logoutBtn = document.getElementById('logoutBtn');
const bloodRequestForm = document.getElementById('bloodRequestForm');
const successModal = document.getElementById('successModal');
const noRequestsAlert = document.getElementById('noRequests');
const requestsContainer = document.getElementById('requestsContainer');
const requestTemplate = document.getElementById('requestTemplate');
const debugStatus = document.getElementById('debug-status');
 // Make debugStatus globally accessible for other scripts
window.debugStatus = debugStatus;

// Test Firebase connection when page loads
testFirebaseConnection();

// Helper function to update debug information
function updateDebug(message) {
    if (debugStatus) {
        debugStatus.textContent = message;
        console.log('Debug:', message);
    }
}

// Test Firebase connection
function testFirebaseConnection() {
    updateDebug('Testing Firebase connection...');
    
    try {
        // Check if we have Firebase initialized
        if (!firebase || !firebase.app) {
            updateDebug('ERROR: Firebase not initialized');
            return;
        }
        
        // Check Firestore connection by fetching a simple document
        db.collection('bloodRequests').limit(1).get()
            .then(() => {
                updateDebug('Firebase connection successful');
            })
            .catch(error => {
                updateDebug(`Firebase connection error: ${error.message}`);
                console.error('Firebase connection test failed:', error);
            });
    } catch (error) {
        updateDebug(`Firebase connection test error: ${error.message}`);
        console.error('Firebase connection test error:', error);
    }
}

// Auth state change listener
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        console.log('User logged in:', user.email);
        console.log('Current path:', window.location.pathname);
        updateDebug(`User authenticated: ${user.email}`);
        
        // Check if we're on the login page
        if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
            window.location.href = 'request.html';
        } else {
            // If on request or status page, initialize the page
            initPage(user);
        }
    } else {
        // User is signed out
        console.log('User logged out');
        updateDebug('User not authenticated, redirecting...');
        
        // Check if we're not on the login page
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }
});

// Initialize page based on which page we're on
function initPage(user) {
    // Set up logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }
    
    // Check which page we're on and initialize accordingly
    const currentPath = window.location.pathname;
    console.log('Initializing page for path:', currentPath);
    
    if (currentPath.includes('request.html')) {
        console.log('Initializing request page');
        initRequestPage(user);
    } else if (currentPath.includes('status.html')) {
        console.log('Initializing status page');
        initStatusPage(user);
    } else {
        // Check by DOM elements instead of path
        if (bloodRequestForm) {
            console.log('Detected request form, initializing request page');
            initRequestPage(user);
        } else if (requestsContainer) {
            console.log('Detected requests container, initializing status page');
            initStatusPage(user);
        }
    }
}

// Initialize the request page
function initRequestPage(user) {
    if (bloodRequestForm) {
        updateDebug('Blood request form ready for submission');
        
        // Add hospital location capture if geolocation is available
        if (navigator.geolocation) {
            const locationBtn = document.getElementById('captureLocationBtn');
            if (locationBtn) {
                locationBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    updateDebug('Capturing hospital location...');
                    
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            const latitude = position.coords.latitude;
                            const longitude = position.coords.longitude;
                            
                            // Store location in hidden fields
                            document.getElementById('hospitalLatitude').value = latitude;
                            document.getElementById('hospitalLongitude').value = longitude;
                            
                            // Update UI to show location captured
                            const locationStatus = document.getElementById('locationStatus');
                            if (locationStatus) {
                                locationStatus.textContent = 'Location captured successfully!';
                                locationStatus.className = 'text-success';
                            }
                            
                            updateDebug(`Location captured: ${latitude}, ${longitude}`);
                        },
                        error => {
                            console.error('Error getting location:', error);
                            updateDebug(`Location error: ${error.message}`);
                            
                            // Update UI to show error
                            const locationStatus = document.getElementById('locationStatus');
                            if (locationStatus) {
                                locationStatus.textContent = `Error: ${error.message}`;
                                locationStatus.className = 'text-danger';
                            }
                        }
                    );
                });
            }
        }
        
        bloodRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            updateDebug('Submitting blood request...');
            
            try {
                // Gather form data
                const patientName = document.getElementById('patientName').value;
                const bloodGroup = document.getElementById('bloodGroup').value;
                const units = parseInt(document.getElementById('units').value);
                const hospital = document.getElementById('hospital').value;
                const address = document.getElementById('address').value;
                const contactNumber = document.getElementById('contactNumber').value;
                const urgency = document.getElementById('urgency').value;
                const additionalInfo = document.getElementById('additionalInfo').value;
                
                // Get hospital location if available
                const hospitalLatitude = document.getElementById('hospitalLatitude')?.value;
                const hospitalLongitude = document.getElementById('hospitalLongitude')?.value;
                
                console.log('Form data:', { patientName, bloodGroup, units, hospital });
                
                const requestData = {
                    userId: user.uid,
                    userEmail: user.email,
                    patientName,
                    bloodGroup,
                    units,
                    hospital,
                    address,
                    contactNumber,
                    urgency,
                    additionalInfo,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'submitted',
                    statusHistory: [{
                        status: 'submitted',
                        comment: 'Request submitted successfully',
                        timestamp: new Date().toISOString()
                    }]
                };
                
                // Add hospital location if available
                if (hospitalLatitude && hospitalLongitude) {
                    requestData.hospitalLocation = {
                        latitude: parseFloat(hospitalLatitude),
                        longitude: parseFloat(hospitalLongitude),
                        capturedAt: new Date().toISOString()
                    };
                }
                
                // Add the request to Firestore
                const docRef = await db.collection('bloodRequests').add(requestData);
                console.log('Document written with ID:', docRef.id);
                updateDebug(`Request submitted successfully! ID: ${docRef.id}`);
                
                // Reset the form
                bloodRequestForm.reset();
                
                // Show success modal
                const modal = new bootstrap.Modal(successModal);
                modal.show();
            } catch (error) {
                console.error('Error adding blood request:', error);
                updateDebug(`ERROR: ${error.message}`);
                alert('Error submitting request. Please try again.');
            }
        });
    } else {
        console.error('Blood request form not found');
    }
}

// Initialize the status page
function initStatusPage(user) {
    updateDebug('Initializing status page, checking for requests...');
    
    console.log('Status page elements:', { 
        noRequestsAlert: !!noRequestsAlert, 
        requestsContainer: !!requestsContainer,
        requestTemplate: !!requestTemplate 
    });
    
    // Test the template functionality
    testTemplateCloning();
    
    // Listen for real-time updates to the user's blood requests
    db.collection('bloodRequests')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            console.log('Got Firestore snapshot, empty:', snapshot.empty, 'size:', snapshot.size);
            
            if (snapshot.empty) {
                updateDebug('No blood requests found for your account');
                if (noRequestsAlert) {
                    console.log('No requests found, showing alert');
                    noRequestsAlert.classList.remove('d-none');
                }
                if (requestsContainer) requestsContainer.innerHTML = '';
                return;
            }
            
            updateDebug(`Found ${snapshot.size} blood requests`);
            
            if (noRequestsAlert) {
                console.log('Requests found, hiding alert');
                noRequestsAlert.classList.add('d-none');
            }
            
            if (requestsContainer) {
                requestsContainer.innerHTML = '';
                
                snapshot.forEach(doc => {
                    console.log('Processing request document:', doc.id);
                    const request = doc.data();
                    request.id = doc.id;
                    
                    // Create request card from template
                    displayRequestCard(request);
                });
            } else {
                console.error('Requests container not found');
                updateDebug('ERROR: Request container element not found');
            }
        }, error => {
            console.error('Error fetching requests:', error);
            updateDebug(`ERROR: ${error.message}`);
        });
}

// Function to test template cloning
function testTemplateCloning() {
    if (!requestTemplate || !requestsContainer) {
        console.error('Cannot test template - template or container not found');
        updateDebug('ERROR: Cannot test template - elements not found');
        return;
    }
    
    updateDebug('Testing template cloning...');
    
    try {
        // Create a test card
        const testRequest = {
            id: 'test-template-123',
            patientName: 'Template Test',
            bloodGroup: 'O+',
            units: 2,
            hospital: 'Test Hospital',
            contactNumber: '555-1234',
            createdAt: new firebase.firestore.Timestamp.now(),
            status: 'submitted',
            statusHistory: [{
                status: 'submitted',
                comment: 'This is a test card to verify template cloning',
                timestamp: new Date().toISOString()
            }]
        };
        
        // Clone the template
        const testCard = document.importNode(requestTemplate.content, true);
        
        // Fill basic data to test
        testCard.querySelector('.id-text').textContent = testRequest.id.slice(0, 8);
        testCard.querySelector('.patient-name').textContent = testRequest.patientName;
        testCard.querySelector('.blood-group').textContent = testRequest.bloodGroup;
        
        // Create a wrapper just for the test
        const testWrapper = document.createElement('div');
        testWrapper.className = 'test-template-wrapper mb-4';
        testWrapper.appendChild(testCard);
        
        // Add temporary heading
        const testHeading = document.createElement('h5');
        testHeading.className = 'text-warning mb-3';
        testHeading.textContent = 'Template Test Card (Will be removed when real data loads)';
        
        // Add to DOM temporarily
        requestsContainer.appendChild(testHeading);
        requestsContainer.appendChild(testWrapper);
        
        updateDebug('Template test successful - will be replaced with real data');
        console.log('Template cloning test complete');
    } catch (error) {
        console.error('Template test error:', error);
        updateDebug(`Template test error: ${error.message}`);
    }
}

// Helper function to get display name for status
function getStatusDisplayName(status) {
    switch(status) {
        case 'submitted':
            return 'Added to Database';
        case 'verified':
            return 'Verified by Delivery Guy';
        case 'searching':
            return 'Searching Blood Banks';
        case 'found':
            return 'Blood Bank Found';
        case 'delivered':
            return 'Ready for Delivery';
        default:
            return capitalize(status);
    }
}

// Display a request card in the status page
function displayRequestCard(request) {
    if (!requestTemplate || !requestsContainer) {
        console.error('Template or container not found');
        return;
    }
    
    console.log('Displaying request card for:', request.id);
    
    // Clone the template
    const requestCard = document.importNode(requestTemplate.content, true);
    
    // Set opacity to 0 initially for all steps (for animation)
    requestCard.querySelectorAll('.progress-step').forEach(step => {
        step.style.opacity = 0;
        step.style.transform = 'translateY(20px)';
    });
    
    // Fill in the data
    requestCard.querySelector('.id-text').textContent = request.id.slice(0, 8);
    requestCard.querySelector('.patient-name').textContent = request.patientName;
    requestCard.querySelector('.blood-group').textContent = request.bloodGroup;
    requestCard.querySelector('.units').textContent = request.units;
    requestCard.querySelector('.hospital').textContent = request.hospital;
    requestCard.querySelector('.contact').textContent = request.contactNumber;
    
    // Format date
    const requestDate = request.createdAt ? new Date(request.createdAt.toDate()) : new Date();
    requestCard.querySelector('.requested-date').textContent = requestDate.toLocaleDateString() + ' ' + 
        requestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Set status badge
    const statusBadge = requestCard.querySelector('.request-status');
    statusBadge.textContent = getStatusDisplayName(request.status);
    statusBadge.classList.add(request.status);
    
    // Add the card to the container
    requestsContainer.appendChild(requestCard);
    
    // Get the newly added card element
    const newCard = requestsContainer.lastElementChild;
    
    // Add highlight animation
    setTimeout(() => {
        newCard.classList.add('highlight');
    }, 100);
    
    // Update progress steps with animation delay 
    setTimeout(() => {
        updateProgressSteps(newCard, request.status);
    }, 300);
    
    // Update status history
    updateStatusHistory(newCard, request.statusHistory);
}

// Update progress steps based on current status
function updateProgressSteps(requestCard, status) {
    console.log('Updating progress steps for status:', status);
    const progressSteps = requestCard.querySelectorAll('.progress-step');
    
    // Define the status order
    const statusOrder = ['submitted', 'verified', 'searching', 'found', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(status);
    
    console.log('Status index:', currentStatusIndex, 'out of', statusOrder.length);
    
    // Hide the step details initially
    requestCard.querySelectorAll('.step-details').forEach(detail => {
        detail.style.display = 'none';
    });
    
    // Update progress steps
    progressSteps.forEach((step, index) => {
        const stepStatus = step.getAttribute('data-status');
        const stepIndex = statusOrder.indexOf(stepStatus);
        
        console.log('Checking step:', stepStatus, 'index:', stepIndex, 'current:', currentStatusIndex);
        
        if (stepIndex < currentStatusIndex) {
            // Completed step
            step.classList.add('completed');
            step.classList.remove('active');
            console.log('Step marked completed:', stepStatus);
            
            // Show step details for all completed steps
            const stepDetails = step.querySelector('.step-details');
            if (stepDetails) stepDetails.style.display = 'block';
        } else if (stepIndex === currentStatusIndex) {
            // Current step
            step.classList.add('active');
            step.classList.remove('completed');
            console.log('Step marked active:', stepStatus);
            
            // Show step details for the active step
            const stepDetails = step.querySelector('.step-details');
            if (stepDetails) stepDetails.style.display = 'block';
        } else {
            // Future step
            step.classList.remove('active', 'completed');
            console.log('Step marked future:', stepStatus);
        }
        
        // Add animation for smooth transitions
        step.style.transition = 'all 0.5s ease';
        
        // Delayed reveal of each step for cascade effect
        setTimeout(() => {
            step.style.opacity = 1;
            step.style.transform = 'translateY(0)';
        }, index * 200);
    });
}

// Update status history list
function updateStatusHistory(requestCard, statusHistory) {
    console.log('Updating status history:', statusHistory);
    
    if (!statusHistory || !Array.isArray(statusHistory)) {
        console.warn('No status history found or invalid format');
        return;
    }
    
    const statusList = requestCard.querySelector('.status-updates-list');
    if (!statusList) {
        console.error('Status list element not found');
        return;
    }
    
    statusList.innerHTML = '';
    
    // Sort by timestamp (newest first)
    const sortedHistory = [...statusHistory].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    console.log('Sorted history items:', sortedHistory.length);
    
    sortedHistory.forEach((entry, index) => {
        console.log(`Creating history item ${index}:`, entry.status);
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.style.animationDelay = `${index * 100}ms`;
        
        const statusText = document.createElement('div');
        statusText.className = 'status-text';
        statusText.innerHTML = `<strong>${getStatusDisplayName(entry.status)}</strong>: ${entry.comment}`;
        
        const timestamp = document.createElement('small');
        timestamp.className = 'timestamp d-block mt-1';
        timestamp.textContent = new Date(entry.timestamp).toLocaleString();
        
        listItem.appendChild(statusText);
        listItem.appendChild(timestamp);
        
        // Add a slight delay before adding to DOM for cascade effect
        setTimeout(() => {
            statusList.appendChild(listItem);
        }, index * 50);
    });
}

// Helper function to capitalize first letter
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Set up Google login
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider)
            .catch(error => {
                console.error('Error during Google sign in:', error);
            });
    });
}