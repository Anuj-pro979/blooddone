// DOM Elements
const donorLogoutBtn = document.getElementById('donorLogoutBtn');
const donorProfileForm = document.getElementById('donorProfileForm');
const donorProfileComplete = document.getElementById('donorProfileComplete');
const donorProfileIncomplete = document.getElementById('donorProfileIncomplete');
const editProfileBtn = document.getElementById('editProfileBtn');
const requestDetailModal = document.getElementById('requestDetailModal');
const donationCommitForm = document.getElementById('donationCommitForm');
const cancelDonationBtn = document.getElementById('cancelDonationBtn');
const urgencyFilter = document.getElementById('urgencyFilter');
const matchingBloodOnly = document.getElementById('matchingBloodOnly');
const locationSharingToggle = document.getElementById('locationSharingToggle');
const locationStatus = document.getElementById('location-status');

// Containers
const availableRequestsContainer = document.getElementById('available-requests-container');
const myDonationsContainer = document.getElementById('my-donations-container');
const completedDonationsContainer = document.getElementById('completed-donations-container');

// Alert elements
const noAvailableRequests = document.getElementById('no-available-requests');
const noMyDonations = document.getElementById('no-my-donations');
const noCompletedDonations = document.getElementById('no-completed-donations');

// Statistics elements
const totalDonationsCounter = document.getElementById('total-donations');
const pendingDonationsCounter = document.getElementById('pending-donations');
const completedDonationsCounter = document.getElementById('completed-donations');
const livesSavedCounter = document.getElementById('lives-saved');

// Current active request for modal
let currentRequestId = null;

// Auth state change listener
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User logged in:', user.email);
        initDonorDashboard(user);
    } else {
        // User is signed out, redirect to index
        window.location.href = 'index.html';
    }
});

// Global variables for location tracking
let watchId = null;
let currentUser = null;

// Initialize the donor dashboard
function initDonorDashboard(user) {
    // Store current user for location tracking
    currentUser = user;
    
    // Set up logout button
    if (donorLogoutBtn) {
        donorLogoutBtn.addEventListener('click', () => {
            // Stop location tracking before logout
            if (watchId) {
                GeoTracking.clearWatch(watchId);
                watchId = null;
            }
            auth.signOut();
        });
    }
    
    // Load donor profile
    loadDonorProfile(user);
    
    // Set up donor profile form
    if (donorProfileForm) {
        donorProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveDonorProfile(user);
        });
    }
    
    // Set up edit profile button
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            showEditProfileForm(user);
        });
    }
    
    // Set up donation commit form
    if (donationCommitForm) {
        donationCommitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            commitToDonation(user);
        });
    }
    
    // Set up cancel donation button
    if (cancelDonationBtn) {
        cancelDonationBtn.addEventListener('click', () => {
            cancelDonation(user);
        });
    }
    
    // Set up location sharing toggle
    if (locationSharingToggle) {
        locationSharingToggle.addEventListener('change', function() {
            if (this.checked) {
                startLocationTracking(user);
            } else {
                stopLocationTracking();
            }
        });
    }
    
    // Set up filters
    if (urgencyFilter) urgencyFilter.addEventListener('change', applyFilters);
    if (matchingBloodOnly) matchingBloodOnly.addEventListener('change', applyFilters);
    
    // Load blood requests and donations
    loadBloodRequests(user);
    loadDonorDonations(user);
}

// Load donor profile from Firestore
function loadDonorProfile(user) {
    db.collection('donors').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const donorData = doc.data();
                // Update UI with donor profile data
                updateDonorProfileUI(donorData);
                // Show complete profile section
                donorProfileComplete.classList.remove('d-none');
                donorProfileIncomplete.classList.add('d-none');
            } else {
                // No profile exists, show the form
                donorProfileComplete.classList.add('d-none');
                donorProfileIncomplete.classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Error loading donor profile:', error);
        });
}

// Update donor profile UI with data
function updateDonorProfileUI(donorData) {
    document.getElementById('donor-name').textContent = donorData.name;
    document.getElementById('donor-blood-group').textContent = donorData.bloodGroup;
    document.getElementById('donor-contact').textContent = donorData.contact;
    document.getElementById('donor-location').textContent = donorData.location;
    
    // Check if location sharing is enabled for this donor
    if (donorData.locationSharing && locationSharingToggle) {
        locationSharingToggle.checked = true;
        locationStatus.textContent = 'Location sharing is enabled';
        locationStatus.classList.remove('text-muted');
        locationStatus.classList.add('text-success');
        
        // Start location tracking if not already started
        if (!watchId && currentUser) {
            startLocationTracking(currentUser);
        }
    }
    
    if (donorData.lastDonation) {
        const lastDonationDate = new Date(donorData.lastDonation);
        document.getElementById('donor-last-donation').textContent = lastDonationDate.toLocaleDateString();
    } else {
        document.getElementById('donor-last-donation').textContent = 'Never';
    }
}

// Save donor profile to Firestore
function saveDonorProfile(user) {
    const donorData = {
        name: document.getElementById('donorName').value,
        bloodGroup: document.getElementById('donorBloodGroup').value,
        contact: document.getElementById('donorContact').value,
        location: document.getElementById('donorLocation').value,
        available: document.getElementById('donorAvailability').checked,
        userId: user.uid,
        email: user.email,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        // Add locationSharing field with default value false
        locationSharing: false
    };
    
    // Add last donation date if provided
    const lastDonationInput = document.getElementById('donorLastDonation').value;
    if (lastDonationInput) {
        donorData.lastDonation = lastDonationInput;
    }
    
    // If this is a new profile, add createdAt timestamp
    db.collection('donors').doc(user.uid).get()
        .then(doc => {
            if (!doc.exists) {
                donorData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }
            
            // Save to Firestore
            return db.collection('donors').doc(user.uid).set(donorData, { merge: true });
        })
        .then(() => {
            console.log('Donor profile saved successfully');
            // Update UI
            updateDonorProfileUI(donorData);
            donorProfileComplete.classList.remove('d-none');
            donorProfileIncomplete.classList.add('d-none');
            // Reload blood requests with updated profile
            loadBloodRequests(user);
        })
        .catch(error => {
            console.error('Error saving donor profile:', error);
        });
}

// Show edit profile form with current data
function showEditProfileForm(user) {
    db.collection('donors').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const donorData = doc.data();
                // Fill form with current data
                document.getElementById('donorName').value = donorData.name || '';
                document.getElementById('donorBloodGroup').value = donorData.bloodGroup || '';
                document.getElementById('donorContact').value = donorData.contact || '';
                document.getElementById('donorLocation').value = donorData.location || '';
                
                if (donorData.lastDonation) {
                    document.getElementById('donorLastDonation').value = donorData.lastDonation;
                } else {
                    document.getElementById('donorLastDonation').value = '';
                }
                
                document.getElementById('donorAvailability').checked = donorData.available !== false;
                
                // Show form
                donorProfileComplete.classList.add('d-none');
                donorProfileIncomplete.classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Error loading donor data for edit:', error);
        });
}

// Load blood requests from Firestore with real-time updates
function loadBloodRequests(user) {
    // First get the donor's blood group
    db.collection('donors').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const donorData = doc.data();
                const donorBloodGroup = donorData.bloodGroup;
                
                // Now load blood requests
                db.collection('bloodRequests')
                    .where('status', 'in', ['submitted', 'verified', 'searching'])
                    .orderBy('createdAt', 'desc')
                    .onSnapshot(snapshot => {
                        const requests = [];
                        
                        snapshot.forEach(doc => {
                            const request = doc.data();
                            request.id = doc.id;
                            
                            // Check if this request already has a donation from this donor
                            db.collection('donations')
                                .where('requestId', '==', request.id)
                                .where('donorId', '==', user.uid)
                                .get()
                                .then(donationSnapshot => {
                                    // If no donation exists from this donor, add to available requests
                                    if (donationSnapshot.empty) {
                                        requests.push(request);
                                        updateAvailableRequestsUI(requests, donorBloodGroup);
                                    }
                                });
                        });
                        
                        // Update statistics
                        updateDonationStatistics(user);
                    }, error => {
                        console.error('Error loading requests:', error);
                    });
            } else {
                // No donor profile, show message
                if (noAvailableRequests) {
                    noAvailableRequests.classList.remove('d-none');
                    noAvailableRequests.textContent = 'Please complete your donor profile to see available requests.';
                }
                if (availableRequestsContainer) {
                    availableRequestsContainer.innerHTML = '';
                }
            }
        })
        .catch(error => {
            console.error('Error loading donor profile for requests:', error);
        });
}

// Update the UI with available blood requests
function updateAvailableRequestsUI(requests, donorBloodGroup) {
    if (!availableRequestsContainer) return;
    
    // Apply filters
    const filteredRequests = filterRequests(requests, donorBloodGroup);
    
    // Clear container
    availableRequestsContainer.innerHTML = '';
    
    if (filteredRequests.length === 0) {
        if (noAvailableRequests) {
            noAvailableRequests.classList.remove('d-none');
        }
    } else {
        if (noAvailableRequests) {
            noAvailableRequests.classList.add('d-none');
        }
        
        // Create request items
        filteredRequests.forEach(request => {
            const requestItem = createRequestItem(request);
            availableRequestsContainer.appendChild(requestItem);
        });
    }
}

// Filter requests based on user preferences
function filterRequests(requests, donorBloodGroup) {
    return requests.filter(request => {
        // Filter by urgency if selected
        const urgencyValue = urgencyFilter ? urgencyFilter.value : '';
        if (urgencyValue && request.urgency !== urgencyValue) {
            return false;
        }
        
        // Filter by blood group compatibility if checkbox is checked
        if (matchingBloodOnly && matchingBloodOnly.checked) {
            if (!isBloodCompatible(donorBloodGroup, request.bloodGroup)) {
                return false;
            }
        }
        
        return true;
    });
}

// Check if donor blood is compatible with recipient
function isBloodCompatible(donorBlood, recipientBlood) {
    // Direct match
    if (donorBlood === recipientBlood) {
        return true;
    }
    
    // Universal donor: O- can donate to anyone
    if (donorBlood === 'O-') {
        return true;
    }
    
    // O+ can donate to A+, B+, AB+, O+
    if (donorBlood === 'O+') {
        return ['A+', 'B+', 'AB+', 'O+'].includes(recipientBlood);
    }
    
    // A- can donate to A+, A-, AB+, AB-
    if (donorBlood === 'A-') {
        return ['A+', 'A-', 'AB+', 'AB-'].includes(recipientBlood);
    }
    
    // A+ can donate to A+, AB+
    if (donorBlood === 'A+') {
        return ['A+', 'AB+'].includes(recipientBlood);
    }
    
    // B- can donate to B+, B-, AB+, AB-
    if (donorBlood === 'B-') {
        return ['B+', 'B-', 'AB+', 'AB-'].includes(recipientBlood);
    }
    
    // B+ can donate to B+, AB+
    if (donorBlood === 'B+') {
        return ['B+', 'AB+'].includes(recipientBlood);
    }
    
    // AB- can donate to AB+, AB-
    if (donorBlood === 'AB-') {
        return ['AB+', 'AB-'].includes(recipientBlood);
    }
    
    // AB+ can only donate to AB+
    if (donorBlood === 'AB+') {
        return recipientBlood === 'AB+';
    }
    
    return false;
}

// Apply filters when user changes filter options
function applyFilters() {
    // Get donor blood group
    const user = auth.currentUser;
    if (user) {
        db.collection('donors').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const donorData = doc.data();
                    // Get all available requests
                    db.collection('bloodRequests')
                        .where('status', 'in', ['submitted', 'verified', 'searching'])
                        .get()
                        .then(snapshot => {
                            const requests = [];
                            snapshot.forEach(doc => {
                                const request = doc.data();
                                request.id = doc.id;
                                requests.push(request);
                            });
                            
                            // Update UI with filtered requests
                            updateAvailableRequestsUI(requests, donorData.bloodGroup);
                        });
                }
            });
    }
}

// Create a request item element
function createRequestItem(request) {
    const template = document.getElementById('requestItemTemplate');
    if (!template) return document.createElement('div');
    
    const clone = template.content.cloneNode(true);
    
    // Fill in request data
    clone.querySelector('.patient-name').textContent = request.patientName;
    clone.querySelector('.request-id').textContent = request.id.substring(0, 8);
    
    const bloodGroupBadge = clone.querySelector('.blood-group');
    bloodGroupBadge.textContent = request.bloodGroup;
    bloodGroupBadge.classList.add('bg-danger');
    
    const urgencyBadge = clone.querySelector('.urgency-badge');
    urgencyBadge.textContent = request.urgency === 'high' ? 'Urgent' : 
                              request.urgency === 'medium' ? 'Medium' : 'Low';
    urgencyBadge.classList.add(request.urgency === 'high' ? 'bg-danger' : 
                             request.urgency === 'medium' ? 'bg-warning' : 'bg-info');
    
    clone.querySelector('.hospital').textContent = request.hospital;
    clone.querySelector('.units').textContent = request.units;
    
    // Format date
    const requestDate = request.createdAt ? new Date(request.createdAt.toDate()) : new Date();
    clone.querySelector('.requested-date').textContent = `Requested on ${requestDate.toLocaleDateString()}`;
    
    // Set up view details button
    const viewDetailsBtn = clone.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', () => {
        showRequestDetails(request);
    });
    
    return clone;
}

// Show request details in modal
function showRequestDetails(request) {
    currentRequestId = request.id;
    
    // Fill modal with request details
    document.getElementById('modal-request-id').textContent = request.id;
    document.getElementById('modal-patient-name').textContent = request.patientName;
    document.getElementById('modal-blood-group').textContent = request.bloodGroup;
    document.getElementById('modal-units').textContent = request.units;
    document.getElementById('modal-hospital').textContent = request.hospital;
    document.getElementById('modal-address').textContent = request.address;
    document.getElementById('modal-contact').textContent = request.contactNumber;
    
    const urgencyText = request.urgency === 'high' ? 'High (Urgent)' : 
                       request.urgency === 'medium' ? 'Medium (Within 24 hours)' : 'Low (Within a week)';
    document.getElementById('modal-urgency').textContent = urgencyText;
    
    document.getElementById('modal-additional-info').textContent = request.additionalInfo || 'None';
    
    // Check if user has already committed to this request
    const user = auth.currentUser;
    if (user) {
        db.collection('donations')
            .where('requestId', '==', request.id)
            .where('donorId', '==', user.uid)
            .get()
            .then(snapshot => {
                const donationCommitted = document.getElementById('donation-committed');
                const donationNotCommitted = document.getElementById('donation-not-committed');
                
                if (!snapshot.empty) {
                    // User has committed to this request
                    const donation = snapshot.docs[0].data();
                    
                    // Show committed view
                    donationCommitted.classList.remove('d-none');
                    donationNotCommitted.classList.add('d-none');
                    
                    // Fill in commitment details
                    const donationDate = new Date(donation.donationDate);
                    document.getElementById('committed-date').textContent = donationDate.toLocaleDateString();
                    
                    const timeText = donation.donationTime === 'morning' ? 'Morning (8AM - 12PM)' : 
                                    donation.donationTime === 'afternoon' ? 'Afternoon (12PM - 4PM)' : 'Evening (4PM - 8PM)';
                    document.getElementById('committed-time').textContent = timeText;
                    
                    // Show status information
                    const statusInfo = document.getElementById('donation-status-info');
                    if (statusInfo) {
                        if (donation.status === 'committed') {
                            statusInfo.textContent = 'Your donation commitment is pending approval.';
                            statusInfo.className = 'text-primary';
                        } else if (donation.status === 'accepted') {
                            statusInfo.textContent = 'Your donation has been accepted! Please come at the scheduled time.';
                            statusInfo.className = 'text-success';
                        } else if (donation.status === 'rejected') {
                            statusInfo.textContent = 'Your donation was declined. Please check for other requests.';
                            statusInfo.className = 'text-danger';
                        } else if (donation.status === 'completed') {
                            statusInfo.textContent = 'Thank you! Your donation has been completed.';
                            statusInfo.className = 'text-success';
                        }
                    }
                    
                    // Show/hide cancel button based on status
                    const cancelBtn = document.getElementById('cancelDonationBtn');
                    if (cancelBtn) {
                        if (donation.status === 'committed') {
                            cancelBtn.classList.remove('d-none');
                        } else {
                            cancelBtn.classList.add('d-none');
                        }
                    }
                } else {
                    // User has not committed yet
                    donationCommitted.classList.add('d-none');
                    donationNotCommitted.classList.remove('d-none');
                    
                    // Set minimum date to today
                    const today = new Date().toISOString().split('T')[0];
                    document.getElementById('donationDate').min = today;
                }
            });
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('requestDetailModal'));
    modal.show();
}

// Commit to donation
function commitToDonation(user) {
    if (!currentRequestId) return;
    
    const donationData = {
        requestId: currentRequestId,
        donorId: user.uid,
        donorEmail: user.email,
        donationDate: document.getElementById('donationDate').value,
        donationTime: document.getElementById('donationTime').value,
        notes: document.getElementById('donationNotes').value,
        status: 'committed',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Get donor information
    db.collection('donors').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const donorData = doc.data();
                donationData.donorName = donorData.name;
                donationData.donorBloodGroup = donorData.bloodGroup;
                donationData.donorContact = donorData.contact;
                donationData.donorLocation = donorData.location;
                
                // Save donation to Firestore
                return db.collection('donations').add(donationData);
            } else {
                throw new Error('Donor profile not found');
            }
        })
        .then(() => {
            console.log('Donation commitment saved successfully');
            
            // Update request with donor information
            return db.collection('bloodRequests').doc(currentRequestId).update({
                hasDonorCommitment: true,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            // Update UI
            const donationCommitted = document.getElementById('donation-committed');
            const donationNotCommitted = document.getElementById('donation-not-committed');
            
            donationCommitted.classList.remove('d-none');
            donationNotCommitted.classList.add('d-none');
            
            const donationDate = new Date(donationData.donationDate);
            document.getElementById('committed-date').textContent = donationDate.toLocaleDateString();
            
            const timeText = donationData.donationTime === 'morning' ? 'Morning (8AM - 12PM)' : 
                            donationData.donationTime === 'afternoon' ? 'Afternoon (12PM - 4PM)' : 'Evening (4PM - 8PM)';
            document.getElementById('committed-time').textContent = timeText;
            
            // Reload donations
            loadDonorDonations(user);
        })
        .catch(error => {
            console.error('Error committing to donation:', error);
        });
}

// Cancel donation commitment
function cancelDonation(user) {
    if (!currentRequestId) return;
    
    // Find the donation document
    db.collection('donations')
        .where('requestId', '==', currentRequestId)
        .where('donorId', '==', user.uid)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                // Delete the donation document
                return db.collection('donations').doc(snapshot.docs[0].id).delete();
            } else {
                throw new Error('Donation not found');
            }
        })
        .then(() => {
            console.log('Donation cancelled successfully');
            
            // Update request to remove donor commitment if this was the only donor
            return db.collection('donations')
                .where('requestId', '==', currentRequestId)
                .get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        // No other donors, update request
                        return db.collection('bloodRequests').doc(currentRequestId).update({
                            hasDonorCommitment: false,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                });
        })
        .then(() => {
            // Update UI
            const donationCommitted = document.getElementById('donation-committed');
            const donationNotCommitted = document.getElementById('donation-not-committed');
            
            donationCommitted.classList.add('d-none');
            donationNotCommitted.classList.remove('d-none');
            
            // Reload donations
            loadDonorDonations(user);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('requestDetailModal'));
            if (modal) modal.hide();
        })
        .catch(error => {
            console.error('Error cancelling donation:', error);
        });
}

// Start location tracking for donor
function startLocationTracking(user) {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        console.error('Geolocation is not supported by your browser');
        alert('Geolocation is not supported by your browser');
        if (locationSharingToggle) locationSharingToggle.checked = false;
        return;
    }
    
    // Update UI
    if (locationStatus) {
        locationStatus.textContent = 'Starting location tracking...';
        locationStatus.classList.remove('text-muted');
        locationStatus.classList.add('text-warning');
    }
    
    // Start watching position
    watchId = GeoTracking.watchPosition((error, locationData) => {
        if (error) {
            console.error('Error getting location:', error);
            if (locationStatus) {
                locationStatus.textContent = 'Error: ' + error.message;
                locationStatus.classList.remove('text-warning', 'text-success');
                locationStatus.classList.add('text-danger');
            }
            if (locationSharingToggle) locationSharingToggle.checked = false;
            return;
        }
        
        // Update UI
        if (locationStatus) {
            locationStatus.textContent = 'Location sharing is active';
            locationStatus.classList.remove('text-warning', 'text-danger');
            locationStatus.classList.add('text-success');
        }
        
        // Update location in Firestore
        GeoTracking.updateUserLocation(user.uid, 'donor', locationData)
            .then(() => {
                console.log('Location updated successfully');
                // Update locationSharing flag if not already set
                return db.collection('donors').doc(user.uid).update({
                    locationSharing: true
                });
            })
            .catch(error => {
                console.error('Error updating location in Firestore:', error);
            });
    });
}

// Stop location tracking
function stopLocationTracking() {
    if (watchId) {
        // Clear the watch
        GeoTracking.clearWatch(watchId);
        watchId = null;
        
        // Update UI
        if (locationStatus) {
            locationStatus.textContent = 'Location sharing is disabled';
            locationStatus.classList.remove('text-success', 'text-warning', 'text-danger');
            locationStatus.classList.add('text-muted');
        }
        
        // Update Firestore if user is logged in
        if (currentUser) {
            db.collection('donors').doc(currentUser.uid).update({
                locationSharing: false
            }).catch(error => {
                console.error('Error updating location sharing status:', error);
            });
        }
    }
}

// Load donor's donations
function loadDonorDonations(user) {
    db.collection('donations')
        .where('donorId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const donations = [];
            
            snapshot.forEach(doc => {
                const donation = doc.data();
                donation.id = doc.id;
                donations.push(donation);
            });
            
            // Update UI with donations
            updateDonationsUI(donations);
            
            // Update statistics
            updateDonationStatistics(user);
        }, error => {
            console.error('Error loading donations:', error);
        });
}

// Update the UI with donor's donations
function updateDonationsUI(donations) {
    // Separate active and completed donations
    const activeDonations = donations.filter(d => d.status === 'committed' || d.status === 'accepted');
    const completedDonations = donations.filter(d => d.status === 'completed');
    const rejectedDonations = donations.filter(d => d.status === 'rejected');
    
    // Update My Donations tab
    if (myDonationsContainer) {
        myDonationsContainer.innerHTML = '';
        
        if (activeDonations.length === 0) {
            if (noMyDonations) noMyDonations.classList.remove('d-none');
        } else {
            if (noMyDonations) noMyDonations.classList.add('d-none');
            
            // For each donation, get the request details and create a donation item
            activeDonations.forEach(donation => {
                db.collection('bloodRequests').doc(donation.requestId).get()
                    .then(doc => {
                        if (doc.exists) {
                            const request = doc.data();
                            request.id = doc.id;
                            
                            // Create donation item with request and donation data
                            const donationItem = createDonationItem(request, donation);
                            myDonationsContainer.appendChild(donationItem);
                        }
                    });
            });
        }
    }
    
    // Update Completed tab
    if (completedDonationsContainer) {
        completedDonationsContainer.innerHTML = '';
        
        if (completedDonations.length === 0) {
            if (noCompletedDonations) noCompletedDonations.classList.remove('d-none');
        } else {
            if (noCompletedDonations) noCompletedDonations.classList.add('d-none');
            
            // For each completed donation, get the request details and create a donation item
            completedDonations.forEach(donation => {
                db.collection('bloodRequests').doc(donation.requestId).get()
                    .then(doc => {
                        if (doc.exists) {
                            const request = doc.data();
                            request.id = doc.id;
                            
                            // Create donation item with request and donation data
                            const donationItem = createDonationItem(request, donation);
                            completedDonationsContainer.appendChild(donationItem);
                        }
                    });
            });
        }
    }
}

// Create a donation item element
function createDonationItem(request, donation) {
    const template = document.getElementById('requestItemTemplate');
    if (!template) return document.createElement('div');
    
    const clone = template.content.cloneNode(true);
    
    // Fill in request data
    clone.querySelector('.patient-name').textContent = request.patientName;
    clone.querySelector('.request-id').textContent = request.id.substring(0, 8);
    
    const bloodGroupBadge = clone.querySelector('.blood-group');
    bloodGroupBadge.textContent = request.bloodGroup;
    bloodGroupBadge.classList.add('bg-danger');
    
    // Show donation status instead of urgency
    const urgencyBadge = clone.querySelector('.urgency-badge');
    urgencyBadge.textContent = donation.status === 'committed' ? 'Committed' : 
                              donation.status === 'accepted' ? 'Accepted' : 
                              donation.status === 'rejected' ? 'Rejected' : 
                              donation.status === 'completed' ? 'Completed' : 'Unknown';
    urgencyBadge.classList.add(donation.status === 'committed' ? 'bg-primary' : 
                             donation.status === 'accepted' ? 'bg-warning' : 
                             donation.status === 'rejected' ? 'bg-danger' : 
                             donation.status === 'completed' ? 'bg-success' : 'bg-secondary');
    
    clone.querySelector('.hospital').textContent = request.hospital;
    clone.querySelector('.units').textContent = request.units;
    
    // Show donation date instead of request date
    const donationDate = new Date(donation.donationDate);
    clone.querySelector('.requested-date').textContent = `Donation on ${donationDate.toLocaleDateString()}`;
    
    // Set up view details button
    const viewDetailsBtn = clone.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', () => {
        showRequestDetails(request);
    });
    
    return clone;
}

// Update donation statistics
function updateDonationStatistics(user) {
    db.collection('donations')
        .where('donorId', '==', user.uid)
        .get()
        .then(snapshot => {
            const donations = [];
            snapshot.forEach(doc => {
                donations.push(doc.data());
            });
            
            const totalDonations = donations.length;
            const pendingDonations = donations.filter(d => d.status === 'committed' || d.status === 'accepted').length;
            const completedDonations = donations.filter(d => d.status === 'completed').length;
            
            // Each donation saves up to 3 lives
            const livesSaved = completedDonations * 3;
            
            // Update counters
            if (totalDonationsCounter) totalDonationsCounter.textContent = totalDonations;
            if (pendingDonationsCounter) pendingDonationsCounter.textContent = pendingDonations;
            if (completedDonationsCounter) completedDonationsCounter.textContent = completedDonations;
            if (livesSavedCounter) livesSavedCounter.textContent = livesSaved;
        })
        .catch(error => {
            console.error('Error updating donation statistics:', error);
        });
}

// Show request details in modal
function showRequestDetails(request) {
    currentRequestId = request.id;
    
    // Fill modal with request details
    document.getElementById('modal-request-id').textContent = request.id;
    document.getElementById('modal-patient-name').textContent = request.patientName;
    document.getElementById('modal-blood-group').textContent = request.bloodGroup;
    document.getElementById('modal-units').textContent = request.units;
    document.getElementById('modal-hospital').textContent = request.hospital;
    document.getElementById('modal-address').textContent = request.address;
    document.getElementById('modal-contact').textContent = request.contactNumber;
    
    const urgencyText = request.urgency === 'high' ? 'High (Urgent)' : 
                       request.urgency === 'medium' ? 'Medium (Within 24 hours)' : 'Low (Within a week)';
    document.getElementById('modal-urgency').textContent = urgencyText;
    
    document.getElementById('modal-additional-info').textContent = request.additionalInfo || 'None';
    
    // Check if user has already committed to this request
    const user = auth.currentUser;
    if (user) {
        // First check if the request has status "ready to deliver" or "blood found"
        if (request.status === 'ready to deliver' || request.status === 'blood found') {
            // Hide both committed and not committed sections
            const donationCommitted = document.getElementById('donation-committed');
            const donationNotCommitted = document.getElementById('donation-not-committed');
            
            donationCommitted.classList.add('d-none');
            donationNotCommitted.classList.add('d-none');
            
            // Show a message that blood has been found
            const statusInfo = document.getElementById('donation-status-info');
            if (statusInfo) {
                statusInfo.textContent = 'Blood has been found for this request.';
                statusInfo.className = 'text-success';
                statusInfo.classList.remove('d-none');
            }
            
            return; // Exit the function early
        }
        
        db.collection('donations')
            .where('requestId', '==', request.id)
            .where('donorId', '==', user.uid)
            .get()
            .then(snapshot => {
                const donationCommitted = document.getElementById('donation-committed');
                const donationNotCommitted = document.getElementById('donation-not-committed');
                
                if (!snapshot.empty) {
                    // User has committed to this request
                    const donation = snapshot.docs[0].data();
                    
                    // Show committed view
                    donationCommitted.classList.remove('d-none');
                    donationNotCommitted.classList.add('d-none');
                    
                    // Fill in commitment details
                    const donationDate = new Date(donation.donationDate);
                    document.getElementById('committed-date').textContent = donationDate.toLocaleDateString();
                    
                    const timeText = donation.donationTime === 'morning' ? 'Morning (8AM - 12PM)' : 
                                    donation.donationTime === 'afternoon' ? 'Afternoon (12PM - 4PM)' : 'Evening (4PM - 8PM)';
                    document.getElementById('committed-time').textContent = timeText;
                    
                    // Show status information
                    const statusInfo = document.getElementById('donation-status-info');
                    if (statusInfo) {
                        if (donation.status === 'committed') {
                            statusInfo.textContent = 'Your donation commitment is pending approval.';
                            statusInfo.className = 'text-primary';
                        } else if (donation.status === 'accepted') {
                            statusInfo.textContent = 'Your donation has been accepted! Please come at the scheduled time.';
                            statusInfo.className = 'text-success';
                        } else if (donation.status === 'rejected') {
                            statusInfo.textContent = 'Your donation was declined. Please check for other requests.';
                            statusInfo.className = 'text-danger';
                        } else if (donation.status === 'completed') {
                            statusInfo.textContent = 'Thank you! Your donation has been completed.';
                            statusInfo.className = 'text-success';
                        }
                    }
                    
                    // Show/hide cancel button based on status
                    const cancelBtn = document.getElementById('cancelDonationBtn');
                    if (cancelBtn) {
                        if (donation.status === 'committed') {
                            cancelBtn.classList.remove('d-none');
                        } else {
                            cancelBtn.classList.add('d-none');
                        }
                    }
                } else {
                    // User has not committed yet
                    donationCommitted.classList.add('d-none');
                    donationNotCommitted.classList.remove('d-none');
                    
                    // Set minimum date to today
                    const today = new Date().toISOString().split('T')[0];
                    document.getElementById('donationDate').min = today;
                }
            });
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('requestDetailModal'));
    modal.show();
}