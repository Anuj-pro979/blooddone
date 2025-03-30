// DOM Elements
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const requestDetailModal = document.getElementById('requestDetailModal');
const statusUpdateForm = document.getElementById('statusUpdateForm');
const searchInput = document.getElementById('searchInput');
const bloodGroupFilter = document.getElementById('bloodGroupFilter');
const urgencyFilter = document.getElementById('urgencyFilter');
const requestItemTemplate = document.getElementById('requestItemTemplate');

// Containers for different status tabs
const allRequestsContainer = document.getElementById('all-requests-container');
const pendingContainer = document.getElementById('pending-container');
const searchingContainer = document.getElementById('searching-container');
const foundContainer = document.getElementById('found-container');
const deliveredContainer = document.getElementById('delivered-container');

// Counter elements
const totalRequestsCounter = document.getElementById('total-requests');
const pendingCounter = document.getElementById('pending-count');
const searchingCounter = document.getElementById('searching-count');
const foundCounter = document.getElementById('found-count');
const deliveredCounter = document.getElementById('delivered-count');

// Current active request for modal
let currentRequestId = null;

// Auth state change listener
auth.onAuthStateChanged(user => {
    if (user) {
        // Check if the user is an admin
        if (isAdmin(user.email)) {
            console.log('Admin logged in:', user.email);
            initAdminDashboard();
        } else {
            // Not an admin, redirect to index
            console.log('Non-admin user, redirecting');
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        }
    } else {
        // User is signed out, redirect to index
        window.location.href = 'index.html';
    }
});

// Initialize the admin dashboard
function initAdminDashboard() {
    // Set up logout button
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }
    
    // Set up status update form
    if (statusUpdateForm) {
        statusUpdateForm.addEventListener('submit', handleStatusUpdate);
    }
    
    // Set up search and filters
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (bloodGroupFilter) bloodGroupFilter.addEventListener('change', applyFilters);
    if (urgencyFilter) urgencyFilter.addEventListener('change', applyFilters);
    
    // Load all blood requests
    loadBloodRequests();
}

// Load blood requests from Firestore with real-time updates
function loadBloodRequests() {
    db.collection('bloodRequests')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const requests = [];
            
            snapshot.forEach(doc => {
                const request = doc.data();
                request.id = doc.id;
                requests.push(request);
            });
            
            // Update the UI with requests
            updateRequestsUI(requests);
            
            // Update statistics
            updateStatistics(requests);
        }, error => {
            console.error('Error loading requests:', error);
        });
}

// Update the UI with requests
function updateRequestsUI(requests) {
    // Clear all containers
    if (allRequestsContainer) allRequestsContainer.innerHTML = '';
    if (pendingContainer) pendingContainer.innerHTML = '';
    if (searchingContainer) searchingContainer.innerHTML = '';
    if (foundContainer) foundContainer.innerHTML = '';
    if (deliveredContainer) deliveredContainer.innerHTML = '';
    
    // Apply filters
    const filteredRequests = filterRequests(requests);
    
    // Display each request
    filteredRequests.forEach(request => {
        // Create request item
        const requestItem = createRequestItem(request);
        
        // Add to all requests container
        if (allRequestsContainer) {
            allRequestsContainer.appendChild(requestItem.cloneNode(true));
        }
        
        // Add to the appropriate status container
        switch (request.status) {
            case 'submitted':
                if (pendingContainer) pendingContainer.appendChild(requestItem.cloneNode(true));
                break;
            case 'verified':
                if (pendingContainer) pendingContainer.appendChild(requestItem.cloneNode(true));
                break;
            case 'searching':
                if (searchingContainer) searchingContainer.appendChild(requestItem.cloneNode(true));
                break;
            case 'donor-committed':
                if (searchingContainer) searchingContainer.appendChild(requestItem.cloneNode(true));
                break;
            case 'donor-accepted':
                if (searchingContainer) searchingContainer.appendChild(requestItem.cloneNode(true));
                break;
            case 'found':
                if (foundContainer) foundContainer.appendChild(requestItem.cloneNode(true));
                break;
            case 'delivered':
                if (deliveredContainer) deliveredContainer.appendChild(requestItem.cloneNode(true));
                break;
        }
    });
    
    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const requestItem = this.closest('.request-item');
            const requestId = requestItem.querySelector('.id-text').textContent;
            openRequestDetails(requestId);
        });
    });
}

// Helper function to get display name for status
function getStatusDisplayName(status) {
    switch(status) {
        case 'submitted':
            return 'Added to Database';
        case 'verified':
            return 'Verified by Delivery Guy';
        case 'searching':
            return 'Searching for Donors';
        case 'donor-committed':
            return 'Donor Committed';
        case 'donor-accepted':
            return 'Donation Scheduled';
        case 'found':
            return 'Blood Bank Found';
        case 'delivered':
            return 'Ready for Delivery';
        default:
            return capitalize(status);
    }
}

// Create a request item from the template
function createRequestItem(request) {
    if (!requestItemTemplate) return document.createElement('div');
    
    // Clone the template
    const requestItem = document.importNode(requestItemTemplate.content, true).querySelector('.request-item');
    
    // Fill in the data
    requestItem.querySelector('.id-text').textContent = request.id;
    requestItem.querySelector('.patient-name').textContent = request.patientName;
    requestItem.querySelector('.blood-group').textContent = request.bloodGroup;
    requestItem.querySelector('.units').textContent = request.units;
    requestItem.querySelector('.hospital').textContent = request.hospital;
    requestItem.querySelector('.contact').textContent = request.contactNumber;
    
    // Format date
    const requestDate = request.createdAt ? new Date(request.createdAt.toDate()) : new Date();
    requestItem.querySelector('.requested-date').textContent = requestDate.toLocaleDateString() + ' ' + 
        requestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Set status badge
    const statusBadge = requestItem.querySelector('.request-status');
    statusBadge.textContent = getStatusDisplayName(request.status);
    statusBadge.classList.add(request.status);
    
    return requestItem;
}

// Open the request details modal
function openRequestDetails(requestId) {
    currentRequestId = requestId;
    
    // Get the request data
    db.collection('bloodRequests').doc(requestId).get()
        .then(doc => {
            if (doc.exists) {
                const request = doc.data();
                
                // Fill in the modal data
                document.getElementById('modal-request-id').textContent = requestId;
                document.getElementById('modal-patient-name').textContent = request.patientName;
                document.getElementById('modal-blood-group').textContent = request.bloodGroup;
                document.getElementById('modal-units').textContent = request.units;
                document.getElementById('modal-hospital').textContent = request.hospital;
                document.getElementById('modal-address').textContent = request.address;
                document.getElementById('modal-contact').textContent = request.contactNumber;
                document.getElementById('modal-urgency').textContent = capitalize(request.urgency);
                document.getElementById('modal-additional-info').textContent = request.additionalInfo || 'N/A';
                
                // Pre-select current status in the dropdown
                document.getElementById('statusUpdate').value = request.status;
                
                // Show status history
                const statusHistoryContainer = document.getElementById('modal-status-history');
                statusHistoryContainer.innerHTML = '';
                
                if (request.statusHistory && Array.isArray(request.statusHistory)) {
                    // Sort by timestamp (newest first)
                    const sortedHistory = [...request.statusHistory].sort((a, b) => {
                        return new Date(b.timestamp) - new Date(a.timestamp);
                    });
                    
                    sortedHistory.forEach(entry => {
                        const listItem = document.createElement('li');
                        listItem.className = 'list-group-item';
                        
                        const statusText = document.createElement('div');
                        statusText.textContent = `${getStatusDisplayName(entry.status)}: ${entry.comment}`;
                        
                        const timestamp = document.createElement('small');
                        timestamp.className = 'timestamp d-block mt-1';
                        timestamp.textContent = new Date(entry.timestamp).toLocaleString();
                        
                        listItem.appendChild(statusText);
                        listItem.appendChild(timestamp);
                        statusHistoryContainer.appendChild(listItem);
                    });
                }
                
                // Show donor commitments
                const donorCommitmentsContainer = document.getElementById('modal-donor-commitments');
                donorCommitmentsContainer.innerHTML = '<p class="text-muted">Loading donor commitments...</p>';
                
                // Fetch donor commitments for this request
                db.collection('donations')
                    .where('requestId', '==', requestId)
                    .get()
                    .then(snapshot => {
                        donorCommitmentsContainer.innerHTML = '';
                        
                        if (snapshot.empty) {
                            donorCommitmentsContainer.innerHTML = '<p class="text-muted">No donor commitments yet</p>';
                            return;
                        }
                        
                        // Create a table for donor commitments
                        const table = document.createElement('table');
                        table.className = 'table table-sm table-bordered';
                        
                        // Create table header
                        const thead = document.createElement('thead');
                        thead.innerHTML = `
                            <tr>
                                <th>Donor Name</th>
                                <th>Blood Group</th>
                                <th>Contact</th>
                                <th>Scheduled Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        `;
                        table.appendChild(thead);
                        
                        // Create table body
                        const tbody = document.createElement('tbody');
                        
                        snapshot.forEach(doc => {
                            const donation = doc.data();
                            const tr = document.createElement('tr');
                            
                            // Format donation date
                            const donationDate = new Date(donation.donationDate);
                            const formattedDate = donationDate.toLocaleDateString();
                            const timeText = donation.donationTime === 'morning' ? 'Morning' : 
                                            donation.donationTime === 'afternoon' ? 'Afternoon' : 'Evening';
                            
                            // Create row content
                            tr.innerHTML = `
                                <td>${donation.donorName || 'N/A'}</td>
                                <td>${donation.donorBloodGroup || 'N/A'}</td>
                                <td>${donation.donorContact || 'N/A'}</td>
                                <td>${formattedDate} (${timeText})</td>
                                <td>
                                    <span class="badge ${donation.status === 'committed' ? 'bg-primary' : 
                                                        donation.status === 'accepted' ? 'bg-success' : 
                                                        donation.status === 'rejected' ? 'bg-danger' : 
                                                        donation.status === 'completed' ? 'bg-success' : 'bg-secondary'}">
                                        ${capitalize(donation.status)}
                                    </span>
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm" role="group">
                                        ${donation.status === 'committed' ? `
                                            <button type="button" class="btn btn-success btn-sm accept-donation" data-donation-id="${doc.id}">Accept</button>
                                            <button type="button" class="btn btn-danger btn-sm reject-donation" data-donation-id="${doc.id}">Reject</button>
                                        ` : ''}
                                        ${donation.status === 'accepted' ? `
                                            <button type="button" class="btn btn-success btn-sm complete-donation" data-donation-id="${doc.id}">Mark Completed</button>
                                        ` : ''}
                                    </div>
                                </td>
                            `;
                            
                            tbody.appendChild(tr);
                        });
                        
                        table.appendChild(tbody);
                        donorCommitmentsContainer.appendChild(table);
                        
                        // Add event listeners to action buttons
                        donorCommitmentsContainer.querySelectorAll('.accept-donation').forEach(button => {
                            button.addEventListener('click', function() {
                                const donationId = this.getAttribute('data-donation-id');
                                updateDonationStatus(donationId, 'accepted');
                            });
                        });
                        
                        donorCommitmentsContainer.querySelectorAll('.reject-donation').forEach(button => {
                            button.addEventListener('click', function() {
                                const donationId = this.getAttribute('data-donation-id');
                                updateDonationStatus(donationId, 'rejected');
                            });
                        });
                        
                        donorCommitmentsContainer.querySelectorAll('.complete-donation').forEach(button => {
                            button.addEventListener('click', function() {
                                const donationId = this.getAttribute('data-donation-id');
                                updateDonationStatus(donationId, 'completed');
                            });
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching donor commitments:', error);
                        donorCommitmentsContainer.innerHTML = '<p class="text-danger">Error loading donor commitments</p>';
                    });
                
                // Show the modal
                const modal = new bootstrap.Modal(requestDetailModal);
                modal.show();
            } else {
                console.error('Request not found');
            }
        })
        .catch(error => {
            console.error('Error fetching request details:', error);
        });
}

// Handle status update
function handleStatusUpdate(e) {
    e.preventDefault();
    
    if (!currentRequestId) return;
    
    const newStatus = document.getElementById('statusUpdate').value;
    const statusComment = document.getElementById('statusComment').value;
    
    const statusUpdate = {
        status: newStatus,
        comment: statusComment,
        timestamp: new Date().toISOString()
    };
    
    // Update the request in Firestore
    db.collection('bloodRequests').doc(currentRequestId).update({
        status: newStatus,
        statusHistory: firebase.firestore.FieldValue.arrayUnion(statusUpdate)
    })
    .then(() => {
        // Close the modal
        bootstrap.Modal.getInstance(requestDetailModal).hide();
        
        // Reset the form
        statusUpdateForm.reset();
        
        // Show success message
        alert('Status updated successfully');
    })
    .catch(error => {
        console.error('Error updating status:', error);
        alert('Error updating status. Please try again.');
    });
}

// Apply filters to the requests
function applyFilters() {
    // This will trigger re-filtering of already loaded requests
    // Actual filtering happens in filterRequests()
    const requestItems = document.querySelectorAll('.request-item');
    requestItems.forEach(item => {
        item.classList.add('highlight');
        setTimeout(() => {
            item.classList.remove('highlight');
        }, 2000);
    });
    
    loadBloodRequests();
}

// Filter requests based on search and filter criteria
function filterRequests(requests) {
    if (!searchInput || !bloodGroupFilter || !urgencyFilter) return requests;
    
    const searchTerm = searchInput.value.toLowerCase();
    const bloodGroup = bloodGroupFilter.value;
    const urgency = urgencyFilter.value;
    
    return requests.filter(request => {
        // Search filter
        const searchFields = [
            request.patientName,
            request.bloodGroup,
            request.hospital,
            request.contactNumber,
            request.id
        ].map(field => field ? field.toString().toLowerCase() : '');
        
        const matchesSearch = searchTerm === '' || 
            searchFields.some(field => field.includes(searchTerm));
        
        // Blood group filter
        const matchesBloodGroup = bloodGroup === '' || request.bloodGroup === bloodGroup;
        
        // Urgency filter
        const matchesUrgency = urgency === '' || request.urgency === urgency;
        
        return matchesSearch && matchesBloodGroup && matchesUrgency;
    });
}

// Update statistics
function updateStatistics(requests) {
    if (!totalRequestsCounter) return;
    
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'submitted' || r.status === 'verified').length;
    const searching = requests.filter(r => r.status === 'searching' || r.status === 'donor-committed' || r.status === 'donor-accepted').length;
    const found = requests.filter(r => r.status === 'found').length;
    const delivered = requests.filter(r => r.status === 'delivered').length;
    
    totalRequestsCounter.textContent = total;
    pendingCounter.textContent = pending;
    searchingCounter.textContent = searching;
    foundCounter.textContent = found;
    deliveredCounter.textContent = delivered;
}

// Update donation status (accept, reject, complete)
function updateDonationStatus(donationId, newStatus) {
    if (!donationId || !newStatus) return;
    
    // Update the donation status in Firestore
    db.collection('donations').doc(donationId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log(`Donation ${donationId} status updated to ${newStatus}`);
        
        // If donation is completed, update the request status to 'found' if not already
        if (newStatus === 'completed' && currentRequestId) {
            db.collection('bloodRequests').doc(currentRequestId).get()
                .then(doc => {
                    if (doc.exists) {
                        const request = doc.data();
                        
                        // Only update if status is not already 'found' or 'delivered'
                        if (request.status !== 'found' && request.status !== 'delivered') {
                            const statusUpdate = {
                                status: 'found',
                                comment: 'Blood donation completed by donor',
                                timestamp: new Date().toISOString()
                            };
                            
                            return db.collection('bloodRequests').doc(currentRequestId).update({
                                status: 'found',
                                statusHistory: firebase.firestore.FieldValue.arrayUnion(statusUpdate)
                            });
                        }
                    }
                })
                .then(() => {
                    // Refresh the donor commitments section
                    openRequestDetails(currentRequestId);
                })
                .catch(error => {
                    console.error('Error updating request status:', error);
                });
        } else {
            // Refresh the donor commitments section
            openRequestDetails(currentRequestId);
        }
    })
    .catch(error => {
        console.error('Error updating donation status:', error);
        alert('Error updating donation status. Please try again.');
    });
}

// Helper function to capitalize first letter
function capitalize(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}