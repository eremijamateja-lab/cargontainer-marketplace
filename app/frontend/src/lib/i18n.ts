export type Language = 'en' | 'sr';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.createRequest': 'Create Request',
    'nav.myTransports': 'My Transports',
    'nav.myOffers': 'My Offers',
    'nav.openRequests': 'Open Requests',
    'nav.allRequests': 'All Requests',
    'nav.marketplace': 'Marketplace',
    'nav.logout': 'Logout',
    'nav.actingFor': 'Working for',
    'nav.login': 'Login',

    // Onboarding
    'onboarding.title': 'Welcome to Cargontainer',
    'onboarding.subtitle': 'Cargontainer is a controlled B2B logistics network for verified companies. Create structured RFQs, receive comparable offers and manage transport execution with trusted logistics partners.',
    'onboarding.selectRole': 'What is your role?',
    'onboarding.companyName': 'Company Name',
    'onboarding.companyPlaceholder': 'e.g. Trans Logistics d.o.o.',
    'onboarding.continue': 'Continue to Dashboard',

    // Landing
    'landing.title': 'Structured logistics RFQs, comparable offers and trusted execution.',
    'landing.subtitle': 'B2B LOGISTICS NETWORK',
    'landing.description': 'Cargontainer connects freight forwarders, carriers, logistics operators, customs/T1 agents and intermodal partners in one controlled B2B environment.',
    'landing.description2': 'Create structured requests, receive comparable offers, select the right partner and follow transport execution from one place.',
    'landing.cta': 'Request Early Access',
    'landing.ctaSection.title': 'Ready to join a controlled B2B logistics network?',
    'landing.ctaSection.subtitle': 'Join verified freight forwarders, carriers, customs/T1 agents, intermodal operators and logistics partners on Cargontainer.',
    'landing.demo.title': 'Demo / Test Access',
    'landing.demo.subtitle': 'Explore the platform without registration',
    'landing.demo.description': 'Click any demo account below to instantly access the platform and explore features. Demo accounts are read-only and do not affect real data.',
    'landing.demo.forwarder': 'Demo Forwarder',
    'landing.demo.carrier': 'Demo Carrier / Transporter',
    'landing.demo.rail': 'Demo Rail / Intermodal Operator',
    'landing.demo.customs': 'Demo Customs Agent',
    'landing.demo.clickToEnter': 'Click to enter demo mode',
    'landing.demo.note': 'Demo accounts are clearly marked and separated from real users.',
    'landing.demo.loggedIn': 'Logged in as',
    'landing.feature1.title': 'Structured RFQs',
    'landing.feature1.desc': 'Create clear logistics requests with origin, destination, cargo details, required services and special instructions.',
    'landing.feature2.title': 'Comparable Offers',
    'landing.feature2.desc': 'Receive standardized offers from verified logistics partners and compare price, route, transit time, service scope and conditions.',
    'landing.feature3.title': 'Verified Partners',
    'landing.feature3.desc': 'Work within a controlled B2B network where company profiles are reviewed before activation.',
    'landing.feature4.title': 'Execution Tracking',
    'landing.feature4.desc': 'Follow transport execution through key milestones and keep operational communication organized.',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Overview of your transport activity',
    'dashboard.activeRequests': 'Open Requests',
    'dashboard.pendingOffers': 'Offers Received',
    'dashboard.activeShipments': 'In Progress',
    'dashboard.completedShipments': 'Delivered',
    'dashboard.recentActivity': 'Recent Transports',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.newRequest': 'New Transport Request',
    'dashboard.viewMarketplace': 'Browse Marketplace',
    'dashboard.viewShipments': 'View Shipments',
    'dashboard.noTransports': 'No transports yet. Create your first request to get started.',
    'dashboard.route': 'Route',
    'dashboard.loading': 'Loading',
    'dashboard.unloading': 'Unloading',
    'dashboard.carrier': 'Carrier',
    'dashboard.containerType': 'Cargo / Equipment',
    'dashboard.pickupDate': 'Pickup Date',
    'dashboard.openMarketplace': 'Open Requests',
    'dashboard.mySubmittedOffers': 'My Offers',
    'dashboard.totalRequests': 'Total Requests',
    'dashboard.browseRequests': 'Browse Requests',

    // Requests
    'requests.title': 'Create Transport Request',
    'requests.new': 'New Request',
    'requests.empty': 'No transport requests yet. Create your first one!',
    'requests.form.origin': 'Origin',
    'requests.form.destination': 'Destination',
    'requests.form.originCountry': 'Origin Country',
    'requests.form.destinationCountry': 'Destination Country',
    'requests.form.transportType': 'Transport Category',
    'requests.form.additionalServices': 'Additional Services',
    'requests.form.transportCategory': 'Transport Category',
    'requests.form.transportMode': 'Transport Mode',
    'requests.form.vehicleType': 'Vehicle Type',
    'requests.form.containerType': 'Container Type',
    'requests.form.containerCount': 'Number of Containers',
    'requests.form.cargoDesc': 'Cargo Description',
    'requests.form.weight': 'Weight (kg)',
    'requests.form.preferredDate': 'Pickup Date',
    'requests.form.deadline': 'Delivery Deadline',
    'requests.form.specialReq': 'Special Requirements',
    'requests.form.company': 'Company Name',
    'requests.form.trackingLink': 'Tracking Link (URL)',
    'requests.form.submit': 'Submit Request',
    'requests.form.cancel': 'Cancel',
    'requests.form.customsServiceType': 'Customs Service Type',
    'requests.form.customsOffice': 'Customs Office / Location',
    'requests.form.invoiceRef': 'Invoice / Reference (optional)',
    'requests.form.pallets': 'Pallets / Volume',
    'requests.viewOffers': 'View Offers',
    'requests.delete': 'Delete',
    'requests.originPlaceholder': 'e.g. Koper Terminal',
    'requests.destinationPlaceholder': 'e.g. Belgrade',
    'requests.trackingPlaceholder': 'https://...',
    'requests.myRequests': 'My Requests',

    // Filters
    'filter.all': 'All',
    'filter.category': 'Category',
    'filter.country': 'Country',
    'filter.originCountry': 'Origin Country',
    'filter.destCountry': 'Destination Country',
    'filter.route': 'Route',
    'filter.clearAll': 'Clear filters',
    'filter.transportMode': 'Mode (FTL/LTL)',
    'filter.vehicleType': 'Vehicle',
    'filter.status': 'Status',
    'filter.allCategories': 'All Categories',
    'filter.allModes': 'All Modes',
    'filter.allCountries': 'All Countries',
    'filter.allStatuses': 'All Statuses',
    'filter.filters': 'Filters',

    // Marketplace
    'marketplace.title': 'Marketplace',
    'marketplace.subtitle': 'Browse available transport requests and submit your offers',
    'alerts.button': 'Alerts',
    'alerts.title': 'Alerts & my routes',
    'alerts.routesTitle': 'My routes',
    'alerts.routesHelp': 'You get an alert for new requests on these routes. No routes = alert for every new request.',
    'alerts.any': 'Any country',
    'alerts.from': 'From',
    'alerts.to': 'To',
    'alerts.bothDirections': 'Both directions',
    'alerts.addRoute': 'Add route',
    'alerts.save': 'Save routes',
    'alerts.saved': 'Routes saved',
    'alerts.saveFailed': 'Saving routes failed',
    'alerts.soundTitle': 'Sound on this computer',
    'alerts.soundHelp': 'Short sound when a new request on your routes appears while Marketplace is open.',
    'alerts.pushTitle': 'Notifications on this device',
    'alerts.pushHelp': 'A notification within seconds, even when Marketplace is closed (phone or computer).',
    'alerts.pushOn': 'On',
    'alerts.pushOff': 'Off',
    'alerts.enable': 'Turn on',
    'alerts.disable': 'Turn off',
    'alerts.test': 'Send test',
    'alerts.testSent': 'Test notification sent',
    'alerts.noDevice': 'No device is registered for this account and company. Turn notifications on above.',
    'alerts.testFailed': 'Sending failed. Turn notifications off and on again.',
    'alerts.deviceRegistered': 'This device receives notifications for the company you are logged in as.',
    'alerts.denied': 'Notifications are blocked in this browser. Allow them in the site settings of the browser.',
    'alerts.unsupported': 'This browser does not support notifications.',
    'alerts.iosHint': 'iPhone: tap Share → "Add to Home Screen", open Marketplace from that icon, then turn notifications on.',
    'alerts.new': 'NEW',
    'alerts.newRequestTitle': 'New request',
    'marketplace.empty': 'No published transport requests available.',
    'marketplace.submitOffer': 'Submit Offer',
    'marketplace.form.carrierName': 'Company Name',
    'marketplace.form.transportMode': 'Transport Mode',
    'marketplace.form.price': 'Price',
    'marketplace.form.currency': 'Currency',
    'marketplace.form.estimatedDays': 'Transit Time (days)',
    'marketplace.form.notes': 'Message (optional)',
    'marketplace.form.submit': 'Submit Offer',

    // Offers
    'offers.title': 'Offers',
    'offers.myOffers': 'My Submitted Offers',
    'offers.receivedOffers': 'Received Offers',
    'offers.allOffers': 'All Offers',
    'offers.empty': 'No offers yet.',
    'offers.accept': 'Accept Offer',
    'offers.reject': 'Reject Offer',
    'offers.perContainer': 'per container',
    'offers.companyName': 'Company',
    'chat.title': 'Messages',
    'chat.empty': 'No messages yet. Say hello to start the conversation.',
    'chat.placeholder': 'Type a message…',
    'chat.button': 'Message',
    'chat.askQuestion': 'Ask a question',
    'chat.threads': 'Messages',
    'chat.noThreads': 'No inquiries yet from carriers.',
    'offers.transitTime': 'Transit Time',
    'offers.message': 'Message',
    'offers.transportOffers': 'Transport Offers',
    'offers.customsOffers': 'Customs / T1 Offers',
    'offers.noTransportOffers': 'No transport offers received yet.',
    'offers.noCustomsOffers': 'No customs/T1 offers received yet.',
    'offers.noReceivedOffers': 'No received offers yet.',
    'offers.noReceivedOffersHint': 'Transport companies will submit offers once they see your request in the marketplace.',
    'offers.noSubmittedOffers': 'No submitted offers yet.',
    'offers.goToMarketplace': 'Browse the marketplace to find transport requests and submit offers.',
    'offers.goToRequests': 'Go to Requests',
    'offers.selectRequest': 'Select a transport request to view received offers.',
    'offers.history': 'History',
    'offers.transportAccepted': 'Transport carrier assigned',
    'offers.customsAccepted': 'Customs agent assigned',
    'offers.submitTransportOffer': 'Submit Transport Offer',
    'offers.submitCustomsOffer': 'Submit Customs / T1 Offer',
    'offers.serviceType.transport': 'Transport',
    'offers.serviceType.customs_t1': 'Customs / T1',
    'offers.fullyCovered': 'All required services covered — transport and customs/T1 providers assigned.',
    'offers.partiallyCovered': 'This request requires both transport and customs/T1. Not all services are covered yet.',

    // Shipments
    'shipments.title': 'My Transports',
    'shipments.empty': 'No active transports. Accepted offers will appear here.',
    'shipments.trackShipment': 'Track Shipment',
    'shipments.track': 'Track',
    'shipments.edit': 'Edit',
    'shipments.editInstruction': 'Edit Instruction',
    'shipments.addInstruction': 'Add Instruction',
    'shipments.note': 'Note',
    'shipments.estimatedDelivery': 'Est. Delivery',
    'shipments.carrier': 'Carrier',
    'shipments.customsAgent': 'Customs Agent',
    'shipments.customsStatus': 'Customs Status',
    'shipments.customsAssigned': 'Customs agent assigned',
    'shipments.awaitingCustoms': 'Awaiting customs agent',
    'shipments.needsCustoms': 'Needs Customs / T1',
    'shipments.activeTransports': 'Active Transports',
    'shipments.completedTransports': 'Completed Transports',
    'shipments.containerNumber': 'Container Number',
    'shipments.transportCarrier': 'Transport Carrier',
    'shipments.requiredServices': 'Required Services',
    'shipments.viewMyRequests': 'View My Requests',
    'shipments.addTrackingLink': 'Add Tracking Link',
    'shipments.updateTrackingLink': 'Update Tracking Link',
    'shipments.driverName': 'Driver Name',
    'shipments.driverPhone': 'Driver Phone',
    'shipments.vehiclePlate': 'Vehicle Plate',
    'shipments.trailerPlate': 'Trailer Plate',
    'shipments.carrierEmail': 'Carrier Email',
    'shipments.carrierPhone': 'Carrier Phone',
    'shipments.saveDetails': 'Save Details',
    'shipments.saving': 'Saving...',
    'shipments.instructions': 'Instructions',
    'shipments.carrierNote': 'Carrier Note',
    'shipments.forwarderInstruction': 'Forwarder Instruction',
    'shipments.forwarderInstructionReadOnly': 'Forwarder Instruction (read-only)',
    'shipments.noShipmentsYet': 'No shipments yet',
    'shipments.noShipmentsHint': 'Accept an offer on one of your transport requests to create a shipment. You can then track its progress here.',
    'shipments.driverVehicleDetails': 'Driver & Vehicle Details',
    'shipments.forwarderInstructions': 'Forwarder Instructions',
    'shipments.trackingUrl': 'Tracking URL',
    'shipments.save': 'Save',
    'shipments.saveInstruction': 'Save Instruction',
    'shipments.goToMarketplace': 'Go to Marketplace',
    'shipments.yourInstructionToCarrier': 'Your Instruction to Carrier/Driver',
    'shipments.carrierNoteReadOnly': 'Carrier Note (read-only)',
    'shipments.noTransportsYet': 'No transports yet',
    'shipments.noTransportsHint': 'Submit offers on transport requests in the marketplace. Once a forwarder accepts your offer, the shipment will appear here for tracking.',
    'common.by': 'by',
    'shipments.statusHistory': 'Status History',
    'shipments.waitingForForwarder': 'Waiting for forwarder to accept an offer',
    'shipments.browseMoreRequests': 'Browse More Requests',

    // Contact
    'contact.title': 'Contact Us',
    'contact.subtitle': 'Get in touch with our team for any questions or to request access to the platform.',
    'contact.name': 'Full Name',
    'contact.email': 'Email Address',
    'contact.company': 'Company',
    'contact.message': 'Message',
    'contact.send': 'Send Message',
    'contact.sent': 'Message sent! We\'ll get back to you soon.',
    'contact.info.title': 'Contact Information',
    'contact.info.address': 'Belgrade, Serbia',
    'contact.info.email': 'info@cargontainer.com',
    'contact.info.phone': '+381 11 123 4567',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.actions': 'Actions',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.from': 'From',
    'common.to': 'To',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.containers': 'containers',
    'common.days': 'days',
    'common.pickup': 'Pickup',
    'common.viewDetails': 'View Details',
    'common.saveChanges': 'Save Changes',
    'common.selectCountry': 'Select country',
    'common.selectVehicleType': 'Select vehicle type',
    'common.selectWagonType': 'Select wagon type',
    'common.selectOption': 'Select option...',
    'common.anonymousCarrier': 'Anonymous Carrier',
    'common.anonymousAgent': 'Anonymous Agent',

    // Form micro labels
    'requests.form.additionalServicesHint': 'Select any additional services needed alongside transport',
    'requests.noMatchFilters': 'No requests match the selected filters.',
    'requests.form.wagonType': 'Wagon Type',
    'requests.form.wagonCount': 'Number of Wagons',
    'requests.form.cargoDimensions': 'Cargo Dimensions (L × W × H in meters)',
    'common.readOnly': 'Read-only',

    // Dialog helper texts
    'shipments.trackingUrlHint': 'Full URL where the forwarder can track this shipment',
    'shipments.carrierNoteHint': 'Visible to forwarder. Add driver availability, special conditions, etc.',
    'shipments.forwarderInstructionHint': 'Visible to carrier and driver. Add loading/unloading instructions, terminal references, special requirements.',

    // Toast messages
    'toast.requestCreated': 'Transport request created!',
    'toast.requestCreatedFail': 'Failed to create request',
    'toast.requestUpdated': 'Request updated!',
    'toast.requestUpdatedFail': 'Failed to update request',
    'toast.requestDeleted': 'Request deleted',
    'toast.requestDeletedFail': 'Failed to delete request',
    'toast.offerSubmitted': 'Offer submitted successfully!',
    'toast.offerSubmittedFail': 'Failed to submit offer',
    'toast.offerAccepted': 'Offer accepted! Shipment created.',
    'toast.offerAcceptedFail': 'Failed to accept offer',
    'toast.offerRejected': 'Offer rejected.',
    'toast.offerRejectedFail': 'Failed to reject offer',
    'toast.trackingUpdated': 'Tracking link updated!',
    'toast.trackingUpdatedFail': 'Failed to update tracking link',
    'toast.detailsSaved': 'Details saved!',
    'toast.detailsSavedFail': 'Failed to save',
    'toast.companyCreated': 'Company created!',
    'toast.companyCreatedFail': 'Failed to create company',
    'toast.companyUpdated': 'Company updated!',
    'toast.companyUpdatedFail': 'Failed to update company',
    'toast.memberAdded': 'Member added successfully',
    'toast.memberAddedFail': 'Failed to add member',
    'toast.memberRemoved': 'Member removed',
    'toast.memberRemovedFail': 'Failed to remove member',
    'toast.joinedCompany': 'Joined company!',
    'toast.joinedCompanyFail': 'Failed to join company',
    'toast.statusUpdated': 'Status updated!',
    'toast.statusUpdatedFail': 'Failed to update status',
    'toast.profileCreated': 'Profile created! Your registration is under review.',
    'toast.profileCreatedFail': 'Failed to create profile',
    'toast.selectRoleAndCompany': 'Please select a role and enter your company name',
    'toast.fillRequired': 'Please fill in all required fields',
    'toast.enterEmail': 'Please enter an email address',
    'toast.roleUpdated': 'Role updated',
    'toast.copiedSuccess': 'Shipment details copied',
    'toast.copiedFail': 'Failed to copy',
    'toast.fillRequiredContact': 'Please fill in required fields',

    // Company
    'nav.company': 'Company',
    'nav.directory': 'Find Company',
    'nav.messages': 'Messages',
    'nav.admin': 'Admin Panel',
    'messages.subtitle': 'All your conversations in one place.',
    'messages.empty': 'No conversations yet.',
    'messages.selectThread': 'Select a conversation to view messages.',

    // Admin & Approval
    'admin.title': 'Admin Panel',
    'admin.pendingCompanies': 'Pending Approval',
    'admin.noPendingMembers': 'No team members pending approval',
    'admin.companyLabel': 'Company',
    'admin.roleLabel': 'Role',
    'admin.allCompanies': 'All Companies',
    'admin.noCompanies': 'No companies found',
    'admin.noPending': 'No companies pending approval',
    'admin.approve': 'Approve',
    'admin.reject': 'Reject',
    'admin.approved': 'Approved',
    'admin.rejected': 'Rejected',
    'admin.pending': 'Pending',
    'admin.companyName': 'Company Name',
    'admin.companyType': 'Type',
    'admin.country': 'Country',
    'admin.registeredBy': 'Registered By',
    'admin.registeredAt': 'Registered At',
    'admin.status': 'Status',
    'admin.actions': 'Actions',
    'admin.editCompany': 'Edit Company',
    'admin.saveChanges': 'Save Changes',
    'admin.approvalStatus': 'Approval Status',
    'admin.registrationNumber': 'Registration Number',
    'admin.companyRoles': 'Company Roles',
    'admin.contactEmail': 'Contact Email',
    'admin.phone': 'Phone',
    'admin.website': 'Website',
    'admin.description': 'Description',
    'admin.address': 'Address',
    'admin.editCompanyTitle': 'Edit Company Details',
    'company.verifiedFieldsLocked': 'Verified company details are approved by platform admin. To request a change, please contact Cargontainer admin.',
    'company.fieldLocked': 'Locked — verified by admin',

    // Pending Approval page
    'approval.pendingTitle': 'Registration Under Review',
    'approval.pendingMessage': 'Your company registration is being reviewed by our team. You will receive access once approved.',
    'approval.rejectedTitle': 'Registration Not Approved',
    'approval.rejectedMessage': 'Unfortunately, your registration was not approved. Please contact support for more information.',
    'approval.contactSupport': 'Contact Support',
    'company.title': 'Company Profile',
    'company.noCompany': 'No company profile yet',
    'company.createCompany': 'Create Company Profile',
    'company.editCompany': 'Edit Company',
    'company.companyName': 'Company Name',
    'company.companyType': 'Company Type',
    'company.country': 'Country',
    'company.city': 'City',
    'company.vatNumber': 'VAT / PIB',
    'company.email': 'Email',
    'company.phone': 'Phone',
    'company.website': 'Website',
    'company.address': 'Address',
    'company.description': 'Description',
    'company.members': 'Team Members',
    'company.noMembers': 'No team members yet',
    'company.addMember': 'Add Member',
    'company.adding': 'Adding...',
    'company.unnamed': 'Unnamed',
    'company.placeholderFullName': 'Full name',
    'company.placeholderEmail': 'colleague@company.com',
    'company.memberName': 'Name',
    'company.memberEmail': 'Email',
    'company.memberPhone': 'Phone (optional)',
    'company.memberRole': 'Role',
    'company.memberStatus': 'Status',
    'company.memberAddedSuccess': 'Member added successfully. Awaiting admin approval.',
    'company.memberAddFailed': 'Failed to add member',
    'company.memberStatusPending': 'Pending Approval',
    'company.memberStatusActive': 'Active',
    'company.memberStatusRejected': 'Rejected',
    'company.memberStatusInactive': 'Inactive',
    'company.memberPendingHelper': 'New members require platform admin approval before becoming active.',
    'admin.members': 'Company Members',
    'admin.memberApprove': 'Approve',
    'admin.memberReject': 'Reject',
    'admin.memberDeactivate': 'Deactivate',
    'admin.memberReactivate': 'Reactivate',
    'admin.memberStatusChanged': 'Member status updated successfully.',
    'admin.pendingMembers': 'Pending Members',
    'admin.activeMembers': 'Active Members',
    'admin.inactiveMembers': 'Inactive Members',
    'admin.rejectedMembers': 'Rejected Members',

    // Pilot Cleanup
    'admin.pilotCleanup': 'Pilot Cleanup',
    'admin.pilotCleanupDesc': 'Identify and archive test data before inviting real pilot companies.',
    'admin.scanTestData': 'Scan Test Data',
    'admin.scanning': 'Scanning...',
    'admin.testRfqs': 'Test RFQs',
    'admin.testOffers': 'Test Offers',
    'admin.testShipments': 'Test Transports',
    'admin.testCompanies': 'Test Companies',
    'admin.testMembers': 'Test Members',
    'admin.noTestData': 'No test data found. Your database is clean.',
    'admin.selectAll': 'Select All',
    'admin.deselectAll': 'Deselect All',
    'admin.archiveSelected': 'Archive Selected Test Data',
    'admin.archiveConfirmTitle': 'Confirm Archive',
    'admin.archiveConfirmMessage': 'You are about to archive selected test data. This action cannot be undone. Type DELETE to confirm.',
    'admin.typeDeleteToConfirm': 'Type DELETE to confirm',
    'admin.archiveButton': 'Archive',
    'admin.archiving': 'Archiving...',
    'admin.cleanupComplete': 'Cleanup completed',
    'admin.rfqsArchived': 'RFQs archived',
    'admin.offersArchived': 'Offers archived',
    'admin.shipmentsArchived': 'Transports archived',
    'admin.companiesArchived': 'Companies archived',
    'admin.membersArchived': 'Members archived',
    'admin.protectedRecord': 'PROTECTED',
    'admin.cleanupErrors': 'Errors',
    'admin.itemsSelected': 'items selected',
    'admin.statusArchivedTest': 'Archived Test',

    'company.driverLimitedAccess': 'Driver access is limited',
    'company.driverAccessDescription': 'Can view assigned shipments (pickup/delivery locations, status, instructions) and update shipment status. Cannot see prices, offers, financial data, or company settings.',
    'company.capabilities': 'Capabilities',
    'company.vehicleTypes': 'Vehicle Types',
    'company.mainRoutes': 'Main Routes',
    'company.transportCategories': 'Transport Categories',
    'company.customsServices': 'Customs Services',
    'company.countriesCovered': 'Countries Covered',
    'company.customsOffices': 'Customs Offices',
    'company.serviceRegions': 'Service Regions',
    'company.save': 'Save Changes',
    'company.create': 'Create Company',
    'company.isPublic': 'Visible in Directory',
    'company.subscriptionPlan': 'Plan',
    'company.activeUsers': 'Active Users',
    'company.ftlCapability': 'FTL Capability',
    'company.ltlCapability': 'LTL Capability',
    'company.customsCapability': 'Customs / T1 Capability',
    'company.supportedVehicleTypes': 'Supported Vehicle Types',
    'company.transportModes': 'Transport Modes',
    'directory.title': 'Company Directory',
    'directory.subtitle': 'Find logistics companies, carriers, and service providers',
    'directory.search': 'Search companies...',
    'directory.filterType': 'Company Type',
    'directory.filterCountry': 'Country',
    'directory.empty': 'No companies found matching your criteria',
    'directory.viewProfile': 'View Profile',
    'directory.memberCount': 'members',
    'directory.allTypes': 'All Types',
    'directory.allCountries': 'All Countries',

    // Company roles
    'company.rolesLabel': 'Company Roles',
    'company.rolesHelper': 'Select all roles that describe your company\'s activities. You can choose more than one role.',
    'company.rolesLocked': 'Company roles are approved by platform admin. To request a role change, please contact Cargontainer admin.',
    'companyRole.freight_forwarder': 'Freight Forwarder',
    'companyRole.carrier': 'Carrier / Transporter',
    'companyRole.container_operator': 'Container Transport Operator',
    'companyRole.customs_agent': 'Customs / T1 Agent',
    'companyRole.intermodal_rail': 'Intermodal / Rail Operator',
    'companyRole.shipping_line': 'Shipping Line / NVOCC',
    'companyRole.terminal_depot': 'Terminal / Depot',
    'companyRole.warehouse_logistics': 'Warehouse / Logistics Operator',

    // Member role labels
    'memberRole.admin': 'Admin',
    'memberRole.operations': 'Operations',
    'memberRole.sales': 'Sales',
    'memberRole.driver': 'Driver',
    'memberRole.member': 'Member',

    // Directory count
    'directory.companyCount': 'companies',
    'directory.companyCountSingular': 'company',

    // Capability labels
    'capability.ftl': 'FTL (Full Truck Load)',
    'capability.ltl': 'LTL (Less Than Truck Load)',
    'capability.container': 'Container Transport',
    'capability.truck_van': 'Truck / Van Transport',
    'capability.rail': 'Rail / Intermodal',
    'capability.oversized': 'Oversized / Special Cargo',
    'capability.customs_only': 'Customs Services',

    // Transport category defaults
    'category.truckVan': 'Truck / Van',
    'category.customsOnly': 'Customs Only',
    'category.rail': 'Rail',
    'category.oversized': 'Oversized / Special',

    // Marketplace descriptions
    'marketplace.terminalSubtitle': 'View all transport requests across the platform',
    'marketplace.forwarderSubtitle': 'Browse open requests from other forwarders — submit Customs/T1 offers where needed',
    'marketplace.forwarderEmpty': 'No open requests from other forwarders at the moment.',
    'marketplace.noMatchFilters': 'No requests match the selected filters.',
    'marketplace.customsPlaceholder': 'Customs clearance details, T1 document handling, terms...',
    'marketplace.offerPlaceholder': 'Route details, terms, and any additional information...',

    // Shipment status labels
    'shipmentStatus.booked': 'Assigned',
    'shipmentStatus.picked_up': 'Picked Up',
    'shipmentStatus.in_transit': 'In Transit',
    'shipmentStatus.border_exit': 'Border Exit',
    'shipmentStatus.in_transit_2': 'In Transit',
    'shipmentStatus.customs': 'Customs',
    'shipmentStatus.in_transit_3': 'In Transit',
    'shipmentStatus.arrived_at_delivery': 'Arrived',
    'shipmentStatus.unloaded': 'Unloaded',
    'shipmentStatus.delivered': 'Delivered',

    // Shipment status detailed labels
    'shipmentStatusDetail.booked': 'Assigned',
    'shipmentStatusDetail.picked_up': 'Picked Up',
    'shipmentStatusDetail.in_transit': 'In Transit (to border)',
    'shipmentStatusDetail.border_exit': 'Border Exit',
    'shipmentStatusDetail.in_transit_2': 'In Transit (to customs)',
    'shipmentStatusDetail.customs': 'Customs Clearance',
    'shipmentStatusDetail.in_transit_3': 'In Transit (to delivery)',
    'shipmentStatusDetail.arrived_at_delivery': 'Arrived at Delivery Location',
    'shipmentStatusDetail.unloaded': 'Unloaded',
    'shipmentStatusDetail.delivered': 'Delivered',

    // Shipment micro labels
    'shipments.statusHistoryToggle': 'Status History',
    'shipments.noActiveTransportsYet': 'No active transports yet',
    'shipments.pendingOffersAwaiting': 'pending offer(s) awaiting acceptance. Once a forwarder accepts your offer, the transport will appear here.',

    // Share tooltips
    'share.whatsapp': 'WhatsApp',
    'share.viber': 'Viber',
    'share.shipment': 'Share shipment',

    // Transport modes
    'transport.ftl': 'FTL (Full Truck Load)',
    'transport.ltl': 'LTL (Less Than Truck Load)',
    'transport.ftl.short': 'FTL',
    'transport.ltl.short': 'LTL',

    // Vehicle types
    'vehicle.van_3_5t': 'Van up to 3.5t',
    'vehicle.truck_7_5t': 'Truck up to 7.5t',
    'vehicle.truck_12t': 'Truck up to 12t',
    'vehicle.trailer_truck': 'Trailer Truck',
    'vehicle.semi_trailer': 'Semi-trailer',

    // Customs service types
    'customs.clearance': 'Customs Clearance',
    'customs.t1_transit': 'T1 Transit Document',
    'customs.documentation': 'Customs Documentation',
    'customs.brokerage': 'Customs Brokerage',

    // Status
    'status.open': 'Open',
    'status.draft': 'Draft',
    'status.published': 'Open',
    'status.offers_received': 'Offers Received',
    'status.assigned': 'Assigned',
    'status.accepted': 'Assigned',
    'status.in_progress': 'In Progress',
    'status.in_transit': 'In Transit',
    'status.delivered': 'Delivered',
    'status.cancelled': 'Cancelled',
    'status.pending': 'Pending',
    'status.rejected': 'Rejected',
    'status.expired': 'Expired',
    'status.active': 'Active',
    'status.completed': 'Delivered',
    'status.booked': 'Assigned',
    'status.picked_up': 'Picked Up',
    'status.customs': 'Customs',
    'status.border_exit': 'Border Exit',
    'status.arrived_at_delivery': 'Arrived',
    'status.unloaded': 'Unloaded',
  },
  sr: {
    // Navigation
    'nav.dashboard': 'Kontrolna tabla',
    'nav.createRequest': 'Kreiraj zahtev',
    'nav.myTransports': 'Moji transporti',
    'nav.myOffers': 'Moje ponude',
    'nav.openRequests': 'Otvoreni zahtevi',
    'nav.allRequests': 'Svi zahtevi',
    'nav.marketplace': 'Tržište',
    'nav.logout': 'Odjava',
    'nav.actingFor': 'Radim u ime firme',
    'nav.login': 'Prijava',

    // Onboarding
    'onboarding.title': 'Dobrodošli u Cargontainer',
    'onboarding.subtitle': 'Cargontainer je kontrolisana B2B logistička mreža za proverene kompanije. Kreirajte strukturisane upite, primajte uporedive ponude i upravljajte izvršenjem transporta sa pouzdanim logističkim partnerima.',
    'onboarding.selectRole': 'Koja je vaša uloga?',
    'onboarding.companyName': 'Naziv kompanije',
    'onboarding.companyPlaceholder': 'npr. Trans Logistics d.o.o.',
    'onboarding.continue': 'Nastavi na kontrolnu tablu',

    // Landing
    'landing.title': 'Strukturisani logistički upiti, uporedive ponude i pouzdano izvršenje.',
    'landing.subtitle': 'B2B LOGISTIČKA MREŽA',
    'landing.description': 'Cargontainer povezuje špeditere, transportere, logističke operatore, carinske/T1 agente i intermodalne partnere u jednom kontrolisanom B2B okruženju.',
    'landing.description2': 'Kreirajte strukturisane upite, primajte uporedive ponude, izaberite pravog partnera i pratite izvršenje transporta sa jednog mesta.',
    'landing.cta': 'Zatraži rani pristup',
    'landing.ctaSection.title': 'Spremni da se pridružite kontrolisanoj B2B logističkoj mreži?',
    'landing.ctaSection.subtitle': 'Pridružite se proverenim špediterima, transporterima, carinskim/T1 agentima, intermodalnim operatorima i logističkim partnerima na Cargontainer platformi.',
    'landing.demo.title': 'Demo / Test pristup',
    'landing.demo.subtitle': 'Istražite platformu bez registracije',
    'landing.demo.description': 'Kliknite na bilo koji demo nalog ispod da odmah pristupite platformi i istražite funkcionalnosti. Demo nalozi su samo za pregled i ne utiču na stvarne podatke.',
    'landing.demo.forwarder': 'Demo Špediter',
    'landing.demo.carrier': 'Demo Prevoznik / Transporter',
    'landing.demo.rail': 'Demo Železnički / Intermodalni Operator',
    'landing.demo.customs': 'Demo Carinski Agent',
    'landing.demo.clickToEnter': 'Kliknite za demo pristup',
    'landing.demo.note': 'Demo nalozi su jasno označeni i odvojeni od stvarnih korisnika.',
    'landing.demo.loggedIn': 'Prijavljeni kao',
    'landing.feature1.title': 'Strukturisani upiti',
    'landing.feature1.desc': 'Kreirajte jasne logističke upite sa mestom utovara, destinacijom, detaljima robe, potrebnim uslugama i posebnim instrukcijama.',
    'landing.feature2.title': 'Uporedive ponude',
    'landing.feature2.desc': 'Primajte standardizovane ponude od proverenih logističkih partnera i uporedite cenu, rutu, tranzitno vreme, obim usluge i uslove.',
    'landing.feature3.title': 'Provereni partneri',
    'landing.feature3.desc': 'Radite u kontrolisanoj B2B mreži u kojoj se profili kompanija proveravaju pre aktivacije.',
    'landing.feature4.title': 'Praćenje izvršenja',
    'landing.feature4.desc': 'Pratite izvršenje transporta kroz ključne statuse i držite operativnu komunikaciju organizovanom.',

    // Dashboard
    'dashboard.title': 'Kontrolna tabla',
    'dashboard.welcome': 'Pregled vaše transportne aktivnosti',
    'dashboard.activeRequests': 'Otvoreni zahtevi',
    'dashboard.pendingOffers': 'Primljene ponude',
    'dashboard.activeShipments': 'U toku',
    'dashboard.completedShipments': 'Isporučeno',
    'dashboard.recentActivity': 'Nedavni transporti',
    'dashboard.quickActions': 'Brze akcije',
    'dashboard.newRequest': 'Novi zahtev za transport',
    'dashboard.viewMarketplace': 'Pregledaj tržište',
    'dashboard.viewShipments': 'Pogledaj pošiljke',
    'dashboard.noTransports': 'Još nema transporta. Kreirajte prvi zahtev da započnete.',
    'dashboard.route': 'Ruta',
    'dashboard.loading': 'Utovar',
    'dashboard.unloading': 'Istovar',
    'dashboard.carrier': 'Prevoznik',
    'dashboard.containerType': 'Roba / Oprema',
    'dashboard.pickupDate': 'Datum preuzimanja',
    'dashboard.openMarketplace': 'Otvoreni zahtevi',
    'dashboard.mySubmittedOffers': 'Moje ponude',
    'dashboard.totalRequests': 'Ukupno zahteva',
    'dashboard.browseRequests': 'Pregledaj zahteve',

    // Requests
    'requests.title': 'Kreiraj zahtev za transport',
    'requests.new': 'Novi zahtev',
    'requests.empty': 'Još nema zahteva za transport. Kreirajte prvi!',
    'requests.form.origin': 'Polazište',
    'requests.form.destination': 'Odredište',
    'requests.form.originCountry': 'Zemlja polazišta',
    'requests.form.destinationCountry': 'Zemlja odredišta',
    'requests.form.transportType': 'Kategorija transporta',
    'requests.form.additionalServices': 'Dodatne usluge',
    'requests.form.transportCategory': 'Kategorija transporta',
    'requests.form.transportMode': 'Režim transporta',
    'requests.form.vehicleType': 'Tip vozila',
    'requests.form.containerType': 'Tip kontejnera',
    'requests.form.containerCount': 'Broj kontejnera',
    'requests.form.cargoDesc': 'Opis tereta',
    'requests.form.weight': 'Težina (kg)',
    'requests.form.preferredDate': 'Datum preuzimanja',
    'requests.form.deadline': 'Rok isporuke',
    'requests.form.specialReq': 'Posebni zahtevi',
    'requests.form.company': 'Naziv kompanije',
    'requests.form.trackingLink': 'Link za praćenje (URL)',
    'requests.form.submit': 'Pošalji zahtev',
    'requests.form.cancel': 'Otkaži',
    'requests.form.customsServiceType': 'Tip carinske usluge',
    'requests.form.customsOffice': 'Carinska ispostava / Lokacija',
    'requests.form.invoiceRef': 'Faktura / Referenca (opciono)',
    'requests.form.pallets': 'Palete / Zapremina',
    'requests.viewOffers': 'Pogledaj ponude',
    'requests.delete': 'Obriši',
    'requests.originPlaceholder': 'npr. Terminal Koper',
    'requests.destinationPlaceholder': 'npr. Beograd',
    'requests.trackingPlaceholder': 'https://...',
    'requests.myRequests': 'Moji zahtevi',

    // Filters
    'filter.all': 'Sve',
    'filter.category': 'Kategorija',
    'filter.country': 'Zemlja',
    'filter.originCountry': 'Zemlja polazišta',
    'filter.destCountry': 'Zemlja odredišta',
    'filter.route': 'Ruta',
    'filter.clearAll': 'Obriši filtere',
    'filter.transportMode': 'Režim (FTL/LTL)',
    'filter.vehicleType': 'Vozilo',
    'filter.status': 'Status',
    'filter.allCategories': 'Sve kategorije',
    'filter.allModes': 'Svi režimi',
    'filter.allCountries': 'Sve zemlje',
    'filter.allStatuses': 'Svi statusi',
    'filter.filters': 'Filteri',

    // Marketplace
    'marketplace.title': 'Tržište',
    'marketplace.subtitle': 'Pregledajte dostupne zahteve za transport i pošaljite vaše ponude',
    'alerts.button': 'Obaveštenja',
    'alerts.title': 'Obaveštenja i moje relacije',
    'alerts.routesTitle': 'Moje relacije',
    'alerts.routesHelp': 'Obaveštenje stiže za nove upite na ovim relacijama. Bez relacija = obaveštenje za svaki novi upit.',
    'alerts.any': 'Bilo koja zemlja',
    'alerts.from': 'Od',
    'alerts.to': 'Do',
    'alerts.bothDirections': 'Oba smera',
    'alerts.addRoute': 'Dodaj relaciju',
    'alerts.save': 'Sačuvaj relacije',
    'alerts.saved': 'Relacije sačuvane',
    'alerts.saveFailed': 'Čuvanje relacija nije uspelo',
    'alerts.soundTitle': 'Zvuk na ovom računaru',
    'alerts.soundHelp': 'Kratak zvuk kad se pojavi novi upit na vašim relacijama dok je Marketplace otvoren.',
    'alerts.pushTitle': 'Obaveštenja na ovom uređaju',
    'alerts.pushHelp': 'Obaveštenje za par sekundi, čak i kad je Marketplace zatvoren (telefon ili računar).',
    'alerts.pushOn': 'Uključeno',
    'alerts.pushOff': 'Isključeno',
    'alerts.enable': 'Uključi',
    'alerts.disable': 'Isključi',
    'alerts.test': 'Pošalji probno',
    'alerts.testSent': 'Probno obaveštenje poslato',
    'alerts.noDevice': 'Za ovaj nalog i firmu nije registrovan nijedan uređaj. Uključite obaveštenja iznad.',
    'alerts.testFailed': 'Slanje nije uspelo. Isključite pa ponovo uključite obaveštenja.',
    'alerts.deviceRegistered': 'Ovaj uređaj prima obaveštenja za firmu u koju ste trenutno prijavljeni.',
    'alerts.denied': 'Obaveštenja su blokirana u ovom browseru. Dozvolite ih u podešavanjima sajta.',
    'alerts.unsupported': 'Ovaj browser ne podržava obaveštenja.',
    'alerts.iosHint': 'iPhone: Share → „Add to Home Screen“, otvorite Marketplace preko te ikonice, pa uključite obaveštenja.',
    'alerts.new': 'NOVO',
    'alerts.newRequestTitle': 'Novi upit',
    'marketplace.empty': 'Nema objavljenih zahteva za transport.',
    'marketplace.submitOffer': 'Pošalji ponudu',
    'marketplace.form.carrierName': 'Naziv kompanije',
    'marketplace.form.transportMode': 'Način transporta',
    'marketplace.form.price': 'Cena',
    'marketplace.form.currency': 'Valuta',
    'marketplace.form.estimatedDays': 'Vreme tranzita (dani)',
    'marketplace.form.notes': 'Poruka (opciono)',
    'marketplace.form.submit': 'Pošalji ponudu',

    // Offers
    'offers.title': 'Ponude',
    'offers.myOffers': 'Moje poslate ponude',
    'offers.receivedOffers': 'Primljene ponude',
    'offers.allOffers': 'Sve ponude',
    'offers.empty': 'Još nema ponuda.',
    'offers.accept': 'Prihvati ponudu',
    'offers.reject': 'Odbij ponudu',
    'offers.perContainer': 'po kontejneru',
    'chat.title': 'Poruke',
    'chat.empty': 'Još nema poruka. Pošaljite prvu da započnete razgovor.',
    'chat.placeholder': 'Unesite poruku…',
    'chat.button': 'Poruke',
    'chat.askQuestion': 'Postavi pitanje',
    'chat.threads': 'Poruke',
    'chat.noThreads': 'Još nema upita od prevoznika.',
    'offers.companyName': 'Kompanija',
    'offers.transitTime': 'Vreme tranzita',
    'offers.message': 'Poruka',
    'offers.transportOffers': 'Ponude za transport',
    'offers.customsOffers': 'Ponude za carinjenje / T1',
    'offers.noTransportOffers': 'Još nema ponuda za transport.',
    'offers.noCustomsOffers': 'Još nema ponuda za carinjenje/T1.',
    'offers.noReceivedOffers': 'Još nema primljenih ponuda.',
    'offers.noReceivedOffersHint': 'Transportne kompanije će poslati ponude kada vide vaš zahtev na tržištu.',
    'offers.noSubmittedOffers': 'Još nema poslatih ponuda.',
    'offers.goToMarketplace': 'Pretražite tržište da pronađete transportne zahteve i pošaljete ponude.',
    'offers.goToRequests': 'Idi na zahteve',
    'offers.selectRequest': 'Izaberite transportni zahtev da vidite primljene ponude.',
    'offers.history': 'Istorija',
    'offers.transportAccepted': 'Prevoznik dodeljen',
    'offers.customsAccepted': 'Carinski agent dodeljen',
    'offers.submitTransportOffer': 'Pošalji transportnu ponudu',
    'offers.submitCustomsOffer': 'Pošalji carinsku / T1 ponudu',
    'offers.serviceType.transport': 'Transport',
    'offers.serviceType.customs_t1': 'Carinjenje / T1',
    'offers.fullyCovered': 'Sve potrebne usluge pokrivene — transport i carinjenje/T1 dodeljeni.',
    'offers.partiallyCovered': 'Ovaj zahtev zahteva i transport i carinjenje/T1. Nisu sve usluge još pokrivene.',

    // Shipments
    'shipments.title': 'Moji transporti',
    'shipments.empty': 'Nema aktivnih transporta. Prihvaćene ponude će se pojaviti ovde.',
    'shipments.trackShipment': 'Prati pošiljku',
    'shipments.track': 'Prati',
    'shipments.edit': 'Izmeni',
    'shipments.editInstruction': 'Izmeni instrukciju',
    'shipments.addInstruction': 'Dodaj instrukciju',
    'shipments.note': 'Beleška',
    'shipments.estimatedDelivery': 'Procenjena isporuka',
    'shipments.carrier': 'Prevoznik',
    'shipments.customsAgent': 'Carinski agent',
    'shipments.customsStatus': 'Status carinjenja',
    'shipments.customsAssigned': 'Carinski agent dodeljen',
    'shipments.awaitingCustoms': 'Čeka se carinski agent',
    'shipments.needsCustoms': 'Potrebno carinjenje / T1',
    'shipments.activeTransports': 'Aktivni transporti',
    'shipments.completedTransports': 'Završeni transporti',
    'shipments.containerNumber': 'Broj kontejnera',
    'shipments.transportCarrier': 'Prevoznik',
    'shipments.requiredServices': 'Potrebne usluge',
    'shipments.viewMyRequests': 'Pogledaj moje zahteve',
    'shipments.addTrackingLink': 'Dodaj link za praćenje',
    'shipments.updateTrackingLink': 'Ažuriraj link za praćenje',
    'shipments.driverName': 'Ime vozača',
    'shipments.driverPhone': 'Telefon vozača',
    'shipments.vehiclePlate': 'Tablica vozila',
    'shipments.trailerPlate': 'Tablica prikolice',
    'shipments.carrierEmail': 'Email prevoznika',
    'shipments.carrierPhone': 'Telefon prevoznika',
    'shipments.saveDetails': 'Sačuvaj detalje',
    'shipments.saving': 'Čuvanje...',
    'shipments.instructions': 'Instrukcije',
    'shipments.carrierNote': 'Napomena prevoznika',
    'shipments.forwarderInstruction': 'Instrukcija špeditera',
    'shipments.forwarderInstructionReadOnly': 'Instrukcija špeditera (samo čitanje)',
    'shipments.noShipmentsYet': 'Još nema transporta',
    'shipments.noShipmentsHint': 'Prihvatite ponudu na jednom od vaših zahteva za transport da biste kreirali pošiljku. Zatim možete pratiti njen napredak ovde.',
    'shipments.driverVehicleDetails': 'Podaci o vozaču i vozilu',
    'shipments.forwarderInstructions': 'Instrukcije špeditera',
    'shipments.trackingUrl': 'Link za praćenje',
    'shipments.save': 'Sačuvaj',
    'shipments.saveInstruction': 'Sačuvaj instrukciju',
    'shipments.goToMarketplace': 'Idi na tržište',
    'shipments.yourInstructionToCarrier': 'Vaša instrukcija prevozniku/vozaču',
    'shipments.carrierNoteReadOnly': 'Napomena prevoznika (samo čitanje)',
    'shipments.noTransportsYet': 'Još nema transporta',
    'shipments.noTransportsHint': 'Pošaljite ponude na zahteve za transport na tržištu. Kada špediter prihvati vašu ponudu, pošiljka će se pojaviti ovde za praćenje.',
    'common.by': 'od',
    'shipments.statusHistory': 'Istorija statusa',
    'shipments.waitingForForwarder': 'Čeka se da špediter prihvati ponudu',
    'shipments.browseMoreRequests': 'Pregledaj još zahteva',

    // Contact
    'contact.title': 'Kontaktirajte nas',
    'contact.subtitle': 'Obratite nam se za sva pitanja ili za pristup platformi.',
    'contact.name': 'Ime i prezime',
    'contact.email': 'Email adresa',
    'contact.company': 'Kompanija',
    'contact.message': 'Poruka',
    'contact.send': 'Pošalji poruku',
    'contact.sent': 'Poruka poslata! Javićemo vam se uskoro.',
    'contact.info.title': 'Kontakt informacije',
    'contact.info.address': 'Beograd, Srbija',
    'contact.info.email': 'info@cargontainer.com',
    'contact.info.phone': '+381 11 123 4567',

    // Common
    'common.loading': 'Učitavanje...',
    'common.error': 'Došlo je do greške',
    'common.save': 'Sačuvaj',
    'common.cancel': 'Otkaži',
    'common.actions': 'Akcije',
    'common.delete': 'Obriši',
    'common.edit': 'Izmeni',
    'common.close': 'Zatvori',
    'common.from': 'Od',
    'common.to': 'Do',
    'common.status': 'Status',
    'common.date': 'Datum',
    'common.containers': 'kontejnera',
    'common.days': 'dana',
    'common.pickup': 'Preuzimanje',
    'common.viewDetails': 'Pogledaj detalje',
    'common.saveChanges': 'Sačuvaj izmene',
    'common.selectCountry': 'Izaberite zemlju',
    'common.selectVehicleType': 'Izaberite tip vozila',
    'common.selectWagonType': 'Izaberite tip vagona',
    'common.selectOption': 'Izaberite opciju...',
    'common.anonymousCarrier': 'Anonimni prevoznik',
    'common.anonymousAgent': 'Anonimni agent',

    // Form micro labels
    'requests.form.additionalServicesHint': 'Izaberite dodatne usluge potrebne uz transport',
    'requests.noMatchFilters': 'Nijedan zahtev ne odgovara izabranim filterima.',
    'requests.form.wagonType': 'Tip vagona',
    'requests.form.wagonCount': 'Broj vagona',
    'requests.form.cargoDimensions': 'Dimenzije tereta (D × Š × V u metrima)',
    'common.readOnly': 'Samo čitanje',

    // Dialog helper texts
    'shipments.trackingUrlHint': 'Puna URL adresa gde špediter može pratiti ovu pošiljku',
    'shipments.carrierNoteHint': 'Vidljivo špediteru. Dodajte dostupnost vozača, posebne uslove, itd.',
    'shipments.forwarderInstructionHint': 'Vidljivo prevozniku i vozaču. Dodajte instrukcije za utovar/istovar, reference terminala, posebne zahteve.',

    // Toast messages
    'toast.requestCreated': 'Zahtev za transport kreiran!',
    'toast.requestCreatedFail': 'Greška pri kreiranju zahteva',
    'toast.requestUpdated': 'Zahtev ažuriran!',
    'toast.requestUpdatedFail': 'Greška pri ažuriranju zahteva',
    'toast.requestDeleted': 'Zahtev obrisan',
    'toast.requestDeletedFail': 'Greška pri brisanju zahteva',
    'toast.offerSubmitted': 'Ponuda uspešno poslata!',
    'toast.offerSubmittedFail': 'Greška pri slanju ponude',
    'toast.offerAccepted': 'Ponuda prihvaćena! Transport kreiran.',
    'toast.offerAcceptedFail': 'Greška pri prihvatanju ponude',
    'toast.offerRejected': 'Ponuda odbijena.',
    'toast.offerRejectedFail': 'Greška pri odbijanju ponude',
    'toast.trackingUpdated': 'Link za praćenje ažuriran!',
    'toast.trackingUpdatedFail': 'Greška pri ažuriranju linka za praćenje',
    'toast.detailsSaved': 'Podaci sačuvani!',
    'toast.detailsSavedFail': 'Greška pri čuvanju',
    'toast.companyCreated': 'Kompanija kreirana!',
    'toast.companyCreatedFail': 'Greška pri kreiranju kompanije',
    'toast.companyUpdated': 'Kompanija ažurirana!',
    'toast.companyUpdatedFail': 'Greška pri ažuriranju kompanije',
    'toast.memberAdded': 'Član uspešno dodat',
    'toast.memberAddedFail': 'Greška pri dodavanju člana',
    'toast.memberRemoved': 'Član uklonjen',
    'toast.memberRemovedFail': 'Greška pri uklanjanju člana',
    'toast.joinedCompany': 'Pridružili ste se kompaniji!',
    'toast.joinedCompanyFail': 'Greška pri pridruživanju kompaniji',
    'toast.statusUpdated': 'Status ažuriran!',
    'toast.statusUpdatedFail': 'Greška pri ažuriranju statusa',
    'toast.profileCreated': 'Profil kreiran! Vaša registracija je na pregledu.',
    'toast.profileCreatedFail': 'Greška pri kreiranju profila',
    'toast.selectRoleAndCompany': 'Izaberite ulogu i unesite naziv kompanije',
    'toast.fillRequired': 'Popunite sva obavezna polja',
    'toast.enterEmail': 'Unesite email adresu',
    'toast.roleUpdated': 'Uloga ažurirana',
    'toast.copiedSuccess': 'Podaci o pošiljci kopirani',
    'toast.copiedFail': 'Greška pri kopiranju',
    'toast.fillRequiredContact': 'Popunite obavezna polja',

    // Company
    'nav.company': 'Kompanija',
    'nav.directory': 'Pronađi kompaniju',
    'nav.messages': 'Poruke',
    'nav.admin': 'Admin panel',
    'messages.subtitle': 'Svi tvoji razgovori na jednom mestu.',
    'messages.empty': 'Još nema razgovora.',
    'messages.selectThread': 'Izaberi razgovor da vidiš poruke.',

    // Admin & Approval
    'admin.title': 'Admin panel',
    'admin.pendingCompanies': 'Na čekanju',
    'admin.noPendingMembers': 'Nema članova tima na čekanju',
    'admin.companyLabel': 'Firma',
    'admin.roleLabel': 'Uloga',
    'admin.allCompanies': 'Sve kompanije',
    'admin.noCompanies': 'Nema kompanija',
    'admin.noPending': 'Nema kompanija na čekanju',
    'admin.approve': 'Odobri',
    'admin.reject': 'Odbij',
    'admin.approved': 'Odobreno',
    'admin.rejected': 'Odbijeno',
    'admin.pending': 'Na čekanju',
    'admin.companyName': 'Naziv kompanije',
    'admin.companyType': 'Tip',
    'admin.country': 'Država',
    'admin.registeredBy': 'Registrovao',
    'admin.registeredAt': 'Datum registracije',
    'admin.status': 'Status',
    'admin.actions': 'Akcije',
    'admin.editCompany': 'Izmeni kompaniju',
    'admin.saveChanges': 'Sačuvaj izmene',
    'admin.approvalStatus': 'Status odobrenja',
    'admin.registrationNumber': 'Matični broj',
    'admin.companyRoles': 'Uloge kompanije',
    'admin.contactEmail': 'Kontakt email',
    'admin.phone': 'Telefon',
    'admin.website': 'Veb sajt',
    'admin.description': 'Opis',
    'admin.address': 'Adresa',
    'admin.editCompanyTitle': 'Izmeni podatke kompanije',
    'company.verifiedFieldsLocked': 'Verifikovane podatke kompanije odobrava administrator platforme. Za promenu podataka kontaktirajte Cargontainer admina.',
    'company.fieldLocked': 'Zaključano — verifikovano od admina',

    // Pending Approval page
    'approval.pendingTitle': 'Registracija na pregledu',
    'approval.pendingMessage': 'Vaša registracija kompanije je na pregledu. Dobićete pristup nakon odobrenja.',
    'approval.rejectedTitle': 'Registracija nije odobrena',
    'approval.rejectedMessage': 'Nažalost, vaša registracija nije odobrena. Kontaktirajte podršku za više informacija.',
    'approval.contactSupport': 'Kontaktirajte podršku',
    'company.title': 'Profil kompanije',
    'company.noCompany': 'Još nema profila kompanije',
    'company.createCompany': 'Kreiraj profil kompanije',
    'company.editCompany': 'Izmeni kompaniju',
    'company.companyName': 'Naziv kompanije',
    'company.companyType': 'Tip kompanije',
    'company.country': 'Država',
    'company.city': 'Grad',
    'company.vatNumber': 'PIB / PDV broj',
    'company.email': 'Email',
    'company.phone': 'Telefon',
    'company.website': 'Veb sajt',
    'company.address': 'Adresa',
    'company.description': 'Opis',
    'company.members': 'Članovi tima',
    'company.noMembers': 'Još nema članova tima',
    'company.addMember': 'Dodaj člana',
    'company.adding': 'Dodavanje...',
    'company.unnamed': 'Bez imena',
    'company.placeholderFullName': 'Ime i prezime',
    'company.placeholderEmail': 'kolega@kompanija.com',
    'company.memberName': 'Ime',
    'company.memberEmail': 'Email',
    'company.memberPhone': 'Telefon (opciono)',
    'company.memberRole': 'Uloga',
    'company.memberStatus': 'Status',
    'company.memberAddedSuccess': 'Član uspešno dodat. Čeka odobrenje admina.',
    'company.memberAddFailed': 'Greška pri dodavanju člana',
    'company.memberStatusPending': 'Čeka odobrenje',
    'company.memberStatusActive': 'Aktivan',
    'company.memberStatusRejected': 'Odbijen',
    'company.memberStatusInactive': 'Neaktivan',
    'company.memberPendingHelper': 'Novi članovi zahtevaju odobrenje platform admina pre aktivacije.',
    'admin.members': 'Članovi kompanije',
    'admin.memberApprove': 'Odobri',
    'admin.memberReject': 'Odbij',
    'admin.memberDeactivate': 'Deaktiviraj',
    'admin.memberReactivate': 'Reaktiviraj',
    'admin.memberStatusChanged': 'Status člana uspešno ažuriran.',
    'admin.pendingMembers': 'Članovi na čekanju',
    'admin.activeMembers': 'Aktivni članovi',
    'admin.inactiveMembers': 'Neaktivni članovi',
    'admin.rejectedMembers': 'Odbijeni članovi',

    // Pilot Cleanup
    'admin.pilotCleanup': 'Priprema za pilot',
    'admin.pilotCleanupDesc': 'Identifikujte i arhivirajte test podatke pre pozivanja pravih pilot kompanija.',
    'admin.scanTestData': 'Skeniraj test podatke',
    'admin.scanning': 'Skeniranje...',
    'admin.testRfqs': 'Test zahtevi',
    'admin.testOffers': 'Test ponude',
    'admin.testShipments': 'Test transporti',
    'admin.testCompanies': 'Test kompanije',
    'admin.testMembers': 'Test članovi',
    'admin.noTestData': 'Nema test podataka. Baza je čista.',
    'admin.selectAll': 'Izaberi sve',
    'admin.deselectAll': 'Poništi izbor',
    'admin.archiveSelected': 'Arhiviraj izabrane test podatke',
    'admin.archiveConfirmTitle': 'Potvrda arhiviranja',
    'admin.archiveConfirmMessage': 'Obrisaćete izabrane test podatke. Ova akcija se ne može poništiti. Ukucajte DELETE za potvrdu.',
    'admin.typeDeleteToConfirm': 'Ukucajte DELETE za potvrdu',
    'admin.archiveButton': 'Arhiviraj',
    'admin.archiving': 'Arhiviranje...',
    'admin.cleanupComplete': 'Čišćenje završeno',
    'admin.rfqsArchived': 'Zahtevi arhivirani',
    'admin.offersArchived': 'Ponude arhivirane',
    'admin.shipmentsArchived': 'Transporti arhivirani',
    'admin.companiesArchived': 'Kompanije arhivirane',
    'admin.membersArchived': 'Članovi arhivirani',
    'admin.protectedRecord': 'ZAŠTIĆENO',
    'admin.cleanupErrors': 'Greške',
    'admin.itemsSelected': 'stavki izabrano',
    'admin.statusArchivedTest': 'Arhivirano test',

    'company.driverLimitedAccess': 'Pristup vozača je ograničen',
    'company.driverAccessDescription': 'Može videti dodeljene pošiljke (lokacije preuzimanja/isporuke, status, instrukcije) i ažurirati status pošiljke. Ne može videti cene, ponude, finansijske podatke ili podešavanja kompanije.',
    'company.capabilities': 'Mogućnosti',
    'company.vehicleTypes': 'Tipovi vozila',
    'company.mainRoutes': 'Glavne rute',
    'company.transportCategories': 'Kategorije transporta',
    'company.customsServices': 'Carinske usluge',
    'company.countriesCovered': 'Pokrivene zemlje',
    'company.customsOffices': 'Carinske ispostave',
    'company.serviceRegions': 'Regioni usluga',
    'company.save': 'Sačuvaj izmene',
    'company.create': 'Kreiraj kompaniju',
    'company.isPublic': 'Vidljivo u direktorijumu',
    'company.subscriptionPlan': 'Plan',
    'company.activeUsers': 'Aktivni korisnici',
    'company.ftlCapability': 'FTL mogućnost',
    'company.ltlCapability': 'LTL mogućnost',
    'company.customsCapability': 'Carinjenje / T1 mogućnost',
    'company.supportedVehicleTypes': 'Podržani tipovi vozila',
    'company.transportModes': 'Režimi transporta',
    'directory.title': 'Direktorijum kompanija',
    'directory.subtitle': 'Pronađite logističke kompanije, prevoznike i pružaoce usluga',
    'directory.search': 'Pretraži kompanije...',
    'directory.filterType': 'Tip kompanije',
    'directory.filterCountry': 'Država',
    'directory.empty': 'Nema kompanija koje odgovaraju vašim kriterijumima',
    'directory.viewProfile': 'Pogledaj profil',
    'directory.memberCount': 'članova',
    'directory.allTypes': 'Svi tipovi',
    'directory.allCountries': 'Sve države',

    // Company roles
    'company.rolesLabel': 'Uloge kompanije',
    'company.rolesHelper': 'Izaberite sve uloge koje opisuju aktivnosti vaše kompanije. Možete izabrati više od jedne uloge.',
    'company.rolesLocked': 'Uloge kompanije odobrava administrator platforme. Za promenu uloga kontaktirajte Cargontainer admina.',

    // Member role labels
    'memberRole.admin': 'Administrator',
    'memberRole.operations': 'Operacije',
    'memberRole.sales': 'Prodaja',
    'memberRole.driver': 'Vozač',
    'memberRole.member': 'Član',

    // Directory count
    'directory.companyCount': 'kompanija',
    'directory.companyCountSingular': 'kompanija',

    // Capability labels
    'capability.ftl': 'FTL (Kompletan tovar)',
    'capability.ltl': 'LTL (Zbirni transport)',
    'capability.container': 'Kontejnerski transport',
    'capability.truck_van': 'Kamion / kombi transport',
    'capability.rail': 'Železnički / intermodalni',
    'capability.oversized': 'Vangabaritno / Specijalno',
    'capability.customs_only': 'Carinske usluge',

    'companyRole.freight_forwarder': 'Špediter',
    'companyRole.carrier': 'Transporter / Prevoznik',
    'companyRole.container_operator': 'Operator kontejnerskog transporta',
    'companyRole.customs_agent': 'Carinski zastupnik / T1 agent',
    'companyRole.intermodal_rail': 'Intermodalni / železnički operator',
    'companyRole.shipping_line': 'Shipping line / NVOCC',
    'companyRole.terminal_depot': 'Terminal / Depo',
    'companyRole.warehouse_logistics': 'Skladišni i logistički operator',

    // Transport category defaults
    'category.truckVan': 'Kamion / Kombi',
    'category.customsOnly': 'Samo carinjenje',
    'category.rail': 'Železnica',
    'category.oversized': 'Vangabaritno / Specijalno',

    // Marketplace descriptions
    'marketplace.terminalSubtitle': 'Pregledajte sve zahteve za transport na platformi',
    'marketplace.forwarderSubtitle': 'Pregledajte otvorene zahteve drugih špeditera — pošaljite ponude za carinjenje/T1 gde je potrebno',
    'marketplace.forwarderEmpty': 'Trenutno nema otvorenih zahteva od drugih špeditera.',
    'marketplace.noMatchFilters': 'Nijedan zahtev ne odgovara izabranim filterima.',
    'marketplace.customsPlaceholder': 'Detalji carinjenja, T1 dokumentacija, uslovi...',
    'marketplace.offerPlaceholder': 'Detalji rute, uslovi i dodatne informacije...',

    // Shipment status labels
    'shipmentStatus.booked': 'Dodeljeno',
    'shipmentStatus.picked_up': 'Preuzeto',
    'shipmentStatus.in_transit': 'U tranzitu',
    'shipmentStatus.border_exit': 'Izlaz sa granice',
    'shipmentStatus.in_transit_2': 'U tranzitu',
    'shipmentStatus.customs': 'Carina',
    'shipmentStatus.in_transit_3': 'U tranzitu',
    'shipmentStatus.arrived_at_delivery': 'Stiglo',
    'shipmentStatus.unloaded': 'Istovareno',
    'shipmentStatus.delivered': 'Isporučeno',

    // Shipment status detailed labels
    'shipmentStatusDetail.booked': 'Dodeljeno',
    'shipmentStatusDetail.picked_up': 'Preuzeto',
    'shipmentStatusDetail.in_transit': 'U tranzitu (do granice)',
    'shipmentStatusDetail.border_exit': 'Izlaz sa granice',
    'shipmentStatusDetail.in_transit_2': 'U tranzitu (do carine)',
    'shipmentStatusDetail.customs': 'Carinjenje',
    'shipmentStatusDetail.in_transit_3': 'U tranzitu (do isporuke)',
    'shipmentStatusDetail.arrived_at_delivery': 'Stiglo na mesto isporuke',
    'shipmentStatusDetail.unloaded': 'Istovareno',
    'shipmentStatusDetail.delivered': 'Isporučeno',

    // Shipment micro labels
    'shipments.statusHistoryToggle': 'Istorija statusa',
    'shipments.noActiveTransportsYet': 'Još nema aktivnih transporta',
    'shipments.pendingOffersAwaiting': 'ponuda na čekanju. Kada špediter prihvati vašu ponudu, transport će se pojaviti ovde.',

    // Share tooltips
    'share.whatsapp': 'WhatsApp',
    'share.viber': 'Viber',
    'share.shipment': 'Podeli pošiljku',

    // Transport modes
    'transport.ftl': 'FTL (Kompletan tovar)',
    'transport.ltl': 'LTL (Zbirni transport)',
    'transport.ftl.short': 'FTL',
    'transport.ltl.short': 'LTL',

    // Vehicle types
    'vehicle.van_3_5t': 'Kombi do 3,5t',
    'vehicle.truck_7_5t': 'Kamion do 7,5t',
    'vehicle.truck_12t': 'Kamion do 12t',
    'vehicle.trailer_truck': 'Kamion s prikolicom',
    'vehicle.semi_trailer': 'Poluprikolica',

    // Customs service types
    'customs.clearance': 'Carinjenje',
    'customs.t1_transit': 'T1 tranzitni dokument',
    'customs.documentation': 'Carinska dokumentacija',
    'customs.brokerage': 'Carinsko posredovanje',

    // Status
    'status.open': 'Otvoreno',
    'status.draft': 'Nacrt',
    'status.published': 'Otvoreno',
    'status.offers_received': 'Ponude primljene',
    'status.assigned': 'Dodeljeno',
    'status.accepted': 'Dodeljeno',
    'status.in_progress': 'U toku',
    'status.in_transit': 'U tranzitu',
    'status.delivered': 'Isporučeno',
    'status.cancelled': 'Otkazano',
    'status.pending': 'Na čekanju',
    'status.rejected': 'Odbijeno',
    'status.expired': 'Isteklo',
    'status.active': 'Aktivno',
    'status.completed': 'Isporučeno',
    'status.booked': 'Dodeljeno',
    'status.picked_up': 'Preuzeto',
    'status.customs': 'Carina',
    'status.border_exit': 'Izlaz sa granice',
    'status.arrived_at_delivery': 'Stiglo',
    'status.unloaded': 'Istovareno',
  },
};

let currentLanguage: Language = (() => {
  try {
    const stored = localStorage.getItem('cargontainer_lang') as Language;
    if (stored === 'en' || stored === 'sr') return stored;
  } catch { /* ignore localStorage errors */ }
  return 'en';
})();

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  localStorage.setItem('cargontainer_lang', lang);
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
}

export function getStatusLabel(status: string): string {
  return t(`status.${status}`) || status;
}

// ─── Language-aware label mappers for micro UI elements ───

/**
 * Transport category labels (container, truck_van, rail, oversized, customs_only, customs_t1)
 */
/**
 * Customs service type labels
 */
const CUSTOMS_SERVICE_TYPE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    customs_clearance: 'Customs Clearance',
    t1_transit: 'T1 Transit Document',
    customs_documentation: 'Customs Documentation',
    customs_brokerage: 'Customs Brokerage',
  },
  sr: {
    customs_clearance: 'Carinjenje',
    t1_transit: 'T1 tranzitni dokument',
    customs_documentation: 'Carinska dokumentacija',
    customs_brokerage: 'Carinsko posredovanje',
  },
};

export function formatCustomsServiceTypeLabel(value: string): string {
  return CUSTOMS_SERVICE_TYPE_LABELS[currentLanguage]?.[value] || CUSTOMS_SERVICE_TYPE_LABELS['en']?.[value] || value;
}

/**
 * Transport category labels (container, truck_van, rail, oversized, customs_only, customs_t1)
 */
const TRANSPORT_CATEGORY_LABELS: Record<Language, Record<string, string>> = {
  en: {
    container: 'Container',
    truck_van: 'Truck / Van',
    rail: 'Rail',
    oversized: 'Oversized',
    customs_only: 'Customs Only',
    customs_t1: 'Customs / T1',
    ftl: 'Truck / Van',
    ltl: 'Truck / Van',
    reefer: 'Container',
  },
  sr: {
    container: 'Kontejner',
    truck_van: 'Kamion / kombi',
    rail: 'Železnica',
    oversized: 'Vangabaritni transport',
    customs_only: 'Samo carinjenje',
    customs_t1: 'Carinjenje / T1',
    ftl: 'Kamion / kombi',
    ltl: 'Kamion / kombi',
    reefer: 'Kontejner',
  },
};

export function formatTransportCategoryLabel(value: string): string {
  return TRANSPORT_CATEGORY_LABELS[currentLanguage]?.[value] || TRANSPORT_CATEGORY_LABELS['en']?.[value] || value;
}

/**
 * Service type labels (transport, customs_t1, customs_only)
 */
const SERVICE_TYPE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    transport: 'Transport',
    customs_t1: 'Customs / T1',
    customs_only: 'Customs Only',
    trucking: 'Trucking',
    intermodal: 'Intermodal',
  },
  sr: {
    transport: 'Transport',
    customs_t1: 'Carinjenje / T1',
    customs_only: 'Samo carinjenje',
    trucking: 'Kamionski transport',
    intermodal: 'Intermodalni transport',
  },
};

export function formatServiceTypeLabel(value: string): string {
  return SERVICE_TYPE_LABELS[currentLanguage]?.[value] || SERVICE_TYPE_LABELS['en']?.[value] || value;
}

/**
 * Transport mode labels (road, rail, sea, intermodal, ftl, ltl)
 */
const TRANSPORT_MODE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    road: 'Trucking',
    rail: 'Rail',
    sea: 'Sea Freight',
    intermodal: 'Intermodal',
    ftl: 'FTL (Full Truck Load)',
    ltl: 'LTL (Less Than Truck Load)',
  },
  sr: {
    road: 'Kamionski transport',
    rail: 'Železnica',
    sea: 'Pomorski transport',
    intermodal: 'Intermodalni transport',
    ftl: 'FTL (Kompletan tovar)',
    ltl: 'LTL (Zbirni transport)',
  },
};

export function formatTransportModeLabel(value: string): string {
  return TRANSPORT_MODE_LABELS[currentLanguage]?.[value] || TRANSPORT_MODE_LABELS['en']?.[value] || value;
}

/**
 * Offer/request status labels (pending, accepted, rejected, awarded, assigned, open, etc.)
 */
const OFFER_STATUS_LABELS: Record<Language, Record<string, string>> = {
  en: {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    awarded: 'Awarded',
    assigned: 'Assigned',
    open: 'Open',
    in_progress: 'In Progress',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    published: 'Open',
    offers_received: 'Offers Received',
    expired: 'Expired',
    active: 'Active',
    draft: 'Draft',
  },
  sr: {
    pending: 'Na čekanju',
    accepted: 'Prihvaćeno',
    rejected: 'Odbijeno',
    awarded: 'Dodeljeno',
    assigned: 'Dodeljeno',
    open: 'Otvoreno',
    in_progress: 'U toku',
    delivered: 'Isporučeno',
    completed: 'Završeno',
    cancelled: 'Otkazano',
    published: 'Otvoreno',
    offers_received: 'Ponude primljene',
    expired: 'Isteklo',
    active: 'Aktivno',
    draft: 'Nacrt',
  },
};

export function formatOfferStatusLabel(value: string): string {
  return OFFER_STATUS_LABELS[currentLanguage]?.[value] || OFFER_STATUS_LABELS['en']?.[value] || value;
}

/**
 * Format "Request #N" in a language-aware way
 */
export function formatRequestLabel(id: number | string): string {
  const lang = currentLanguage;
  if (lang === 'sr') return `Zahtev #${id}`;
  return `Request #${id}`;
}

/**
 * Additional services badge labels
 */
const ADDITIONAL_SERVICE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    customs_t1: 'Customs / T1',
  },
  sr: {
    customs_t1: 'Carinjenje / T1',
  },
};

export function formatAdditionalServiceLabel(value: string): string {
  return ADDITIONAL_SERVICE_LABELS[currentLanguage]?.[value] || ADDITIONAL_SERVICE_LABELS['en']?.[value] || value;
}

/**
 * Vehicle type labels (van_3_5t, truck_7_5t, etc.)
 */
const VEHICLE_TYPE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    van_3_5t: 'Van up to 3.5t',
    truck_7_5t: 'Truck up to 7.5t',
    truck_12t: 'Truck up to 12t',
    trailer_truck: 'Trailer Truck',
    semi_trailer: 'Semi-trailer',
  },
  sr: {
    van_3_5t: 'Kombi do 3.5t',
    truck_7_5t: 'Kamion do 7.5t',
    truck_12t: 'Kamion do 12t',
    trailer_truck: 'Kamion s prikolicom',
    semi_trailer: 'Poluprikolica',
  },
};

export function formatVehicleTypeLabel(value: string): string {
  return VEHICLE_TYPE_LABELS[currentLanguage]?.[value] || VEHICLE_TYPE_LABELS['en']?.[value] || value;
}

/**
 * Transport mode short labels (FTL, LTL) — language-aware
 */
const TRANSPORT_MODE_SHORT_LABELS: Record<Language, Record<string, string>> = {
  en: {
    ftl: 'FTL',
    ltl: 'LTL',
  },
  sr: {
    ftl: 'FTL / Pun kamion',
    ltl: 'LTL / Delimičan utovar',
  },
};

export function formatTransportModeShortLabel(value: string): string {
  return TRANSPORT_MODE_SHORT_LABELS[currentLanguage]?.[value] || TRANSPORT_MODE_SHORT_LABELS['en']?.[value] || value;
}

/**
 * Next action button label — imperative form "Mark as ..."
 */
const NEXT_ACTION_LABELS: Record<Language, Record<string, string>> = {
  en: {
    picked_up: 'Mark as Picked Up',
    in_transit: 'Mark as In Transit',
    border_exit: 'Mark as Border Exit',
    in_transit_2: 'Mark as In Transit',
    customs: 'Mark as Customs',
    in_transit_3: 'Mark as In Transit',
    arrived_at_delivery: 'Mark as Arrived',
    unloaded: 'Mark as Unloaded',
    delivered: 'Mark as Delivered',
  },
  sr: {
    picked_up: 'Označi kao preuzeto',
    in_transit: 'Označi kao u tranzitu',
    border_exit: 'Označi kao izlaz sa granice',
    in_transit_2: 'Označi kao u tranzitu',
    customs: 'Označi kao carina',
    in_transit_3: 'Označi kao u tranzitu',
    arrived_at_delivery: 'Označi kao stiglo',
    unloaded: 'Označi kao istovareno',
    delivered: 'Označi kao isporučeno',
  },
};

export function formatNextActionLabel(nextStep: string): string {
  return NEXT_ACTION_LABELS[currentLanguage]?.[nextStep] || NEXT_ACTION_LABELS['en']?.[nextStep] || nextStep;
}

/**
 * "Delivered on ..." badge text
 */
export function formatDeliveredLabel(timestamp?: string): string {
  const lang = currentLanguage;
  if (lang === 'sr') {
    return timestamp ? `Isporučeno ${timestamp}` : 'Isporučeno';
  }
  return timestamp ? `Delivered on ${timestamp}` : 'Delivered';
}

/**
 * Company/user role labels for the top-right header display.
 * Maps legacy profile.role values AND canonical company_roles to human-readable labels.
 */
const ROLE_DISPLAY_LABELS: Record<Language, Record<string, string>> = {
  en: {
    forwarder: 'Freight Forwarder',
    freight_forwarder: 'Freight Forwarder',
    trucking: 'Carrier / Transporter',
    carrier: 'Carrier / Transporter',
    rail: 'Rail / Intermodal Operator',
    intermodal_rail: 'Intermodal / Rail Operator',
    terminal: 'Terminal / Depot',
    terminal_depot: 'Terminal / Depot',
    customs_agent: 'Customs / T1 Agent',
    container_operator: 'Container Transport Operator',
    warehouse_logistics: 'Warehouse / Logistics Operator',
    shipping_line: 'Shipping Line / NVOCC',
  },
  sr: {
    forwarder: 'Špediter',
    freight_forwarder: 'Špediter',
    trucking: 'Transporter / Prevoznik',
    carrier: 'Transporter / Prevoznik',
    rail: 'Intermodalni / železnički operator',
    intermodal_rail: 'Intermodalni / železnički operator',
    terminal: 'Terminal / Depo',
    terminal_depot: 'Terminal / Depo',
    customs_agent: 'Carinski zastupnik / T1 agent',
    container_operator: 'Operator kontejnerskog transporta',
    warehouse_logistics: 'Skladišni i logistički operator',
    shipping_line: 'Brodska linija / NVOCC',
  },
};

export function formatRoleLabel(value: string): string {
  return ROLE_DISPLAY_LABELS[currentLanguage]?.[value] || ROLE_DISPLAY_LABELS['en']?.[value] || value;
}

/**
 * Member role labels for team members table (admin, operations, sales, driver, member)
 */
export function formatMemberRoleLabel(value: string): string {
  return t(`memberRole.${value}`) || value;
}

/**
 * Capability labels for company profile badges (ftl, ltl, container, truck_van, rail, oversized, customs_only)
 */
export function formatCapabilityLabel(value: string): string {
  return t(`capability.${value}`) || value;
}

/**
 * Company role label — language-aware version of COMPANY_ROLE_MAP[role].label
 * Used in Directory badges and Company profile role display.
 */
export function formatCompanyRoleLabel(value: string): string {
  return t(`companyRole.${value}`) || value;
}