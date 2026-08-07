# Zero-Cost Personal Edge Cloud Storage with Intelligent Offline Synchronization

1. Problem Statement: 
    Existing cloud storage systems require recurring subscription costs and store user data on third-party infrastructure. Home storage solutions eliminate subscription costs but become unavailable whenever the storage device is offline.

    This project proposes a zero-cost personal edge cloud that uses existing household hardware while allowing users to continue working through intelligent synchronization, temporary local queues and offline browser storage.

2. Objectives:

    - Zero monthly cost
    - Personal ownership of data
    - Multiple Household users
    - Storage quota management
    - Upload queue during storage node downtime
    - Automatic synchronisation
    - trusted device offline access
    - Intelligent scheduling
    - Secure authentication

3. Hardware
    Development Laptop
    
    - React
    - VS Code
    - Development

    Storage Node desktop

    - FastAPI
    - PostgreSL
    - Scheduler

    500 GB SSD

    - Metadata
    - database
    - Temporary landing zone

    1 TB HDD

    - Permanent file storage //No SSD wasted that's already in Desktop

4. Architecture

                 GitHub Pages

                       │

               React Frontend

                       │

              FastAPI Backend

                       │

              PostgreSQL Database

                       │

        ┌──────────────┴──────────────┐

        │                             │

 Upload Scheduler              Storage Node

        │                             │

        ▼                             ▼

   Desktop SSD                 Desktop HDD

5. Workflow:
    Upload

    ↓

    Browser Queue

    ↓

    Storage Node Online

    ↓

    Synchronization

    ↓

    SSD

    ↓

    HDD

