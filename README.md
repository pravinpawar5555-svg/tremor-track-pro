# VibraSense Pro

Yes. For your use case, I would design this as a Vibration Monitoring Operations & Analyst Management System, not just a dashboard.

The software should allow you, as the manager/team lead, to see what machines are being monitored, what data the two engineers reviewed, what abnormalities they identified, whether alerts were acted upon, and what reports were generated. It should also create an auditable record of the engineers' daily work.

Below is a master prompt you can review and modify before we start building the software.

Master Prompt — Forbes Marshall Vibration Monitoring Software

Software Development Prompt

1. Project Name

Forbes Marshall – Vibration Monitoring & Condition Monitoring Operations Platform

Develop a professional web-based software application for the Forbes Marshall Vibration Monitoring / Condition Monitoring Team.

The primary purpose of the application is to manage and monitor the daily work of vibration-analysis engineers who remotely review customer rotating-machine vibration data, identify abnormalities, communicate findings, and generate periodic vibration-monitoring reports.

The application must support both:

Vibration analysis and condition monitoring

Management supervision and performance monitoring of the vibration-analysis team

The software should be designed as a scalable enterprise application that can later support additional engineers, customers, sites, machines and monitoring parameters.

2. Business Objective

Forbes Marshall currently has engineers who review customer machine-health and vibration data on a daily basis.

Initially, there will be two vibration-analysis engineers responsible for customer monitoring.

The software must enable the manager/team lead to:

Monitor daily analyst activity

Monitor customer machine-health status

See which machines were reviewed

Identify machines that were not reviewed

See abnormal machines identified by engineers

Review analyst observations

Track alerts and abnormalities

Track customer communication/action

Monitor pending actions

Review daily/weekly/monthly performance

Generate customer reports

Generate internal management reports

Maintain a complete history/audit trail of monitoring activities

The software should reduce dependency on Excel, email and manual tracking.

3. Primary User Roles

Implement role-based access control.

Role 1 – Administrator

Administrator can:

Create/edit/delete users

Create customers

Create sites

Create machines

Configure machine hierarchy

Configure vibration points/sensors

Configure alarm limits

Configure user permissions

Configure report templates

Configure notification settings

Manage system settings

Role 2 – Vibration Analyst / Engineer

Engineer can:

View assigned customers

View assigned sites

View assigned machines

Review vibration data

Review trends

Review FFT/spectrum

Review time waveform

Review overall vibration

Review RPM/order information where available

Review other available condition-monitoring parameters

Record observations

Classify abnormalities

Create alerts

Assign severity

Recommend actions

Add comments

Attach supporting information

Mark machine/data as reviewed

Generate reports

Update action status

Role 3 – Manager / Team Lead

Manager has complete monitoring visibility.

Manager dashboard must show:

Total customers

Total sites

Total machines

Machines due for review

Machines reviewed today

Machines pending review

Abnormal machines

Critical alerts

Open alerts

Closed alerts

Overdue actions

Customer reports pending

Reports generated

Engineer-wise workload

Engineer-wise review completion

Engineer-wise abnormalities identified

Engineer-wise pending activities

Customer-wise health status

Manager should be able to drill down:

Company → Customer → Site → Machine → Measurement Point → Sensor → Vibration Data → Analyst Observation → Alert → Action → Report

4. Customer Hierarchy

The application should use the following hierarchy:

Company

→ Customer

→ Plant/Site

→ Area

→ Machine Group

→ Machine

→ Machine Component

→ Measurement Point

→ Sensor

→ Measurement Data

Example:

Forbes Marshall

→ Customer A

→ Pune Plant

→ Utility Area

→ Pump Section

→ Cooling Water Pump P-101

→ Motor

→ DE Bearing

→ Accelerometer

→ Vibration Data

The hierarchy must be configurable.

5. Machine Master

For every machine maintain:

Machine ID

Machine name

Machine type

Customer

Site

Area

Machine criticality

Manufacturer

Model

Rated RPM

Operating RPM

Rated power

Voltage

Bearing information

Bearing manufacturer

Bearing number

Coupling type

Gear information where applicable

Installation date

Commissioning date

Monitoring frequency

Assigned vibration analyst

Machine status

Monitoring status

Machine criticality:

Critical

High

Medium

Low

6. Vibration Measurement Data

The system should support integration with the Forbes Marshall vibration-monitoring/data-acquisition system.

The architecture must support API-based or database-based data ingestion.

Potential data types include:

Overall acceleration

Overall velocity

Overall displacement

RMS

Peak

Peak-to-peak

Crest factor

Kurtosis

Temperature

RPM

Acceleration spectrum

Velocity spectrum

Displacement spectrum

Time waveform

Envelope spectrum

Envelope waveform

Order spectrum

Phase

Other condition-monitoring parameters

The system must retain historical data for trending and analysis.

7. Vibration Analysis Dashboard

For every machine provide a machine-health dashboard.

Display:

Current Condition

Machine health status

Overall vibration

RMS

Peak

Temperature

RPM

Latest measurement timestamp

Last analyst review timestamp

Current alarm status

Trend

Provide selectable trends:

24 hours

7 days

30 days

3 months

6 months

1 year

Custom period

Allow overlay of:

Alarm limits

Alert limits

Historical measurements

Analyst observations

Events

8. Vibration Spectrum Analysis

Provide an interactive spectrum viewer.

Features:

FFT spectrum

Zoom

Pan

Cursor

Frequency value

Amplitude value

Harmonic markers

RPM marker

1X marker

2X marker

3X marker

Bearing defect frequency markers

Gear mesh frequency marker

Sideband markers where applicable

Frequency band selection

Linear/log amplitude scale

Linear/log frequency scale

The analyst should be able to save observations against a specific spectrum.

Example:

"Dominant 1X running-speed component observed with increased radial vibration. Possible unbalance condition. Recommend field inspection and confirmation of operating condition."

The software must NOT automatically convert a spectral pattern into a confirmed mechanical fault without analyst confirmation.

AI-assisted diagnosis can be added later as a recommendation layer.

9. Time Waveform

Provide an interactive time waveform viewer.

Display:

Time

Amplitude

RMS

Peak

Peak-to-peak

Crest factor

Kurtosis

Allow:

Zoom

Cursor

Measurement

Comparison with historical waveform

Export

10. Analyst Daily Work Queue

This is one of the most important modules.

Each engineer should have a daily work queue.

Example:

CustomerSiteMachinePriorityLast DataReview StatusAnalystCustomer APunePump P-101High09:30PendingEngineer 1Customer BMumbaiFan F-202Medium10:15ReviewedEngineer 2

Work queue status:

Pending

In Review

Reviewed – Normal

Reviewed – Observation

Abnormality Identified

Alert Raised

Awaiting Customer Action

Closed

The system should automatically generate the daily work queue based on monitoring frequency and available data.

11. Daily Analyst Review Process

For every machine review, the engineer should follow a structured workflow:

Step 1

Open machine.

Step 2

Review latest vibration data.

Step 3

Compare with historical trend.

Step 4

Review FFT/spectrum.

Step 5

Review time waveform where required.

Step 6

Check RPM/operating condition.

Step 7

Compare against alarm thresholds.

Step 8

Check previous analyst observations.

Step 9

Enter observation.

Step 10

Classify condition.

Condition classification:

Normal

Watch

Observation

Abnormal

Critical

Step 11

Recommended action.

Step 12

Submit review.

The system must record:

Analyst

Date

Time

Machine

Data reviewed

Observation

Classification

Recommended action

Status

12. Abnormality / Alert Management

When an engineer identifies an abnormality, they should create an alert.

Alert fields:

Alert ID

Customer

Site

Machine

Component

Measurement point

Date/time

Analyst

Abnormal parameter

Observed value

Normal/reference value

Trend information

Frequency/component involved

Suspected fault category

Severity

Analyst observation

Recommended action

Customer notification status

Action owner

Target date

Closure date

Closure comments

Severity:

Advisory

Low

Medium

High

Critical

Do not allow the system to automatically declare a mechanical fault as confirmed solely from vibration data.

Use terminology such as:

"Possible"

"Suspected"

"Indication of"

"Requires verification"

unless the analyst explicitly confirms the diagnosis based on sufficient evidence.

13. Fault Classification

Create a structured vibration-diagnosis classification system.

Examples:

Rotating Equipment

Unbalance

Misalignment

Mechanical looseness

Structural looseness

Soft foot

Resonance

Rub

Bent shaft

Coupling issue

Bearing

Bearing defect

Outer race indication

Inner race indication

Rolling-element indication

Cage-related indication

Lubrication-related indication

Gearbox

Gear mesh

Gear tooth defect

Sidebands

Gear eccentricity

Backlash

Lubrication issue

Process

Cavitation

Recirculation

Flow-related vibration

Electrical

Electrical frequency-related vibration

Rotor/stator-related indication

Other electrical vibration signatures

Unknown

Further investigation required

Allow analysts to select one or more suspected categories.

14. Engineer Observation Quality

Manager should be able to review the quality and completeness of analyst observations.

Each observation should contain:

What was observed?

Where was it observed?

When did it change?

What parameter changed?

What frequency/component is involved?

What is the historical trend?

What is the suspected cause?

What evidence supports the observation?

What action is recommended?

What is the priority?

This creates standardized vibration-analysis reporting.

15. Manager Dashboard

Create a professional management dashboard.

Top KPI Cards

Total Customers

Total Sites

Total Machines

Machines Due Today

Machines Reviewed Today

Review Completion %

Open Alerts

Critical Alerts

Pending Actions

Overdue Actions

Reports Pending

Reports Generated

Analyst Performance

Display for each engineer:

Assigned machines

Machines reviewed

Pending reviews

Review completion %

Abnormalities identified

Alerts generated

Alerts pending

Reports generated

Average review time

Overdue reviews

Avoid using analyst performance metrics as the sole basis for judging diagnostic quality; provide drill-down into the underlying reviews and observations.

16. Customer Health Dashboard

For each customer display:

Total machines

Healthy machines

Machines under observation

Abnormal machines

Critical machines

Open alerts

Pending customer actions

Overdue actions

Last report

Next report due

Use simple visual status indicators.

17. Machine Health Score

Create a configurable machine-health indicator.

The score should consider configurable factors such as:

Overall vibration

Trend

Alarm level

Rate of change

Temperature

Historical baseline

Analyst observation

Open alerts

However, the health score must be transparent.

The user must be able to see:

Why is this machine classified as healthy / watch / abnormal?

Do not create a black-box score.

18. Weekly Report

Automatically generate weekly customer reports.

Report should contain:

Executive Summary

Machines monitored

Machines reviewed

Normal machines

Machines requiring attention

New abnormalities

Existing abnormalities

Closed abnormalities

Machine-wise Summary

MachineStatusVibration TrendObservationRecommendation

Detailed Abnormalities

For each abnormal machine:

Machine

Parameter

Trend graph

Spectrum

Observation

Suspected condition

Recommendation

Current status

Generate PDF and Excel where applicable.

19. Monthly Report

Monthly report should include:

Executive summary

Monitoring coverage

Machine health distribution

Major observations

New alerts

Closed alerts

Open alerts

Long-term trends

Repeated abnormalities

Machine-wise condition

Recommendations

Analyst comments

Include graphical trends where useful.

20. Report Generation

Reports should be generated using configurable templates.

Allow:

Forbes Marshall logo

Customer logo

Site information

Reporting period

Analyst name

Reviewer/manager name

Revision number

Document number

Report workflow:

Draft → Review → Approved → Sent to Customer

Maintain report version history.

21. Notification System

Notifications should be configurable.

Possible notification triggers:

Critical vibration

Significant vibration increase

New abnormality

Machine not reviewed

Customer action overdue

Report due

Report generated

Alert closed

Notification channels can later include:

Email

In-app notification

Microsoft Teams

Other enterprise communication systems

22. Daily Manager Summary

The manager should receive a daily summary showing:

Monitoring Coverage

Total machines due

Reviewed

Pending

Completion percentage

Abnormalities

New abnormalities

Critical alerts

High alerts

Pending actions

Team Activity

Engineer 1 activity

Engineer 2 activity

Reviews completed

Alerts raised

Reports generated

Pending workload

Management Attention Required

Show machines that require immediate review.

23. Audit Trail

Every important action must be logged.

Audit:

User

Date/time

Action

Previous value

New value

Machine

Customer

Alert

Report

Example:

Engineer 1 changed Pump P-101 status from "Watch" to "Abnormal" on 22-Sep-2026 at 10:42.

Audit records should not be editable by normal users.

24. Search and Filtering

Provide global search.

Search by:

Customer

Site

Machine

Machine ID

Sensor

Alert ID

Analyst

Date

Condition

Severity

Provide filters across dashboards.

25. Data Visualization

Use professional industrial condition-monitoring visualization.

Charts should include:

Trend

Spectrum

Waterfall

Heatmap

Bar chart

Machine status distribution

Alert trend

Analyst workload

Monitoring coverage

Do not overload the dashboard with unnecessary charts.

Prioritize actionable information.

26. Data Architecture

Design the system with a scalable architecture.

Recommended logical architecture:

Data Acquisition Layer
↓
Data Ingestion/API Layer
↓
Signal Processing Layer
↓
Condition Monitoring Database
↓
Analytics/Rules Engine
↓
Vibration Analyst Interface
↓
Manager Dashboard
↓
Reporting Engine
↓
Notification Layer

The system should support future integration with Forbes Marshall's existing vibration-monitoring platform.

27. API Requirements

Design REST APIs or equivalent service interfaces for:

Customer

Site

Machine

Sensor

Measurement

Spectrum

Waveform

Trend

Alert

Observation

Review

User

Report

Notification

Use authentication and authorization for every protected API.

28. Database

Design a normalized relational database.

Core entities:

Users

Roles

Customers

Sites

Areas

Machines

Components

Bearings

Sensors

Measurements

Spectra

Waveforms

Reviews

Observations

Alerts

Actions

Reports

Notifications

Audit Logs

The design should support large historical vibration datasets.

Do not store large waveform/spectrum data inefficiently inside ordinary transactional tables if a time-series/object-storage architecture is more appropriate.

29. Security

Implement:

Role-based access control

Secure authentication

Password policy

Session management

API authentication

Data encryption

Audit logging

Customer data isolation

Backup

Recovery

Access logging

A user should only see customers/sites/machines permitted by their role.

30. Responsive UI

The application should work on:

Desktop

Laptop

Tablet

Primary use is desktop/laptop.

UI should have an industrial/professional appearance suitable for Forbes Marshall.

Suggested navigation:

Dashboard

Customers

Sites

Machines

Monitoring

Daily Work Queue

Alerts

Actions

Reports

Team Monitoring

Analytics

Administration

31. Important Manager Feature – "What Needs My Attention?"

The manager dashboard should have a dedicated section:

Attention Required

Automatically identify:

Critical alerts

High-severity abnormalities

Machines not reviewed

Machines with rapidly increasing vibration

Customer actions overdue

Alerts awaiting analyst action

Reports pending

Machines with missing data

Sensors/data communication failures

This section should be prioritized by urgency.

32. Important Analyst Feature – "Today's Work"

Every analyst should immediately see:

Today's Work

Machines to review

Priority

Latest data available

Previous condition

Current condition

Last review

Pending actions

Alerts requiring follow-up

The analyst should be able to complete a review with minimum clicks.

33. Automatic Data-Quality Monitoring

The software must distinguish between:

Machine abnormality

and

Data/sensor abnormality

Examples:

Sensor offline

No data received

Communication failure

Constant value

Missing samples

Invalid RPM

Saturated signal

Excessive noise

Unreasonable measurement

Create a separate Data Quality status.

Do not generate a machine-health alarm when the underlying data is invalid.

34. AI Assistance – Future Phase

Design the architecture so AI-assisted vibration analysis can be added later.

Potential AI functions:

Automatic trend-change detection

Spectrum pattern identification

Abnormality prioritization

Suggested fault categories

Automatic report draft

Analyst observation assistance

Natural-language machine summary

AI output must always be presented as:

AI-assisted recommendation

and must require analyst review/approval before being communicated to customers.

35. Development Approach

Develop the system in phases.

Phase 1 – MVP

Implement:

Login

User roles

Customer

Site

Machine master

Sensor master

Data ingestion

Machine dashboard

Trend

Daily work queue

Analyst observation

Alert management

Manager dashboard

Basic report generation

Audit trail

Phase 2

Add:

FFT/spectrum viewer

Time waveform viewer

Advanced vibration analysis

Automated alert detection

Customer portal

Email notifications

Advanced reporting

Performance analytics

Phase 3

Add:

AI-assisted diagnostics

Automated report generation

Advanced anomaly detection

Predictive analytics

Additional condition-monitoring parameters

Enterprise integrations

36. Technology Selection

Before development, propose a suitable technology stack.

Evaluate:

Frontend

React / Angular / Vue

Backend

Python FastAPI / .NET / Node.js

Database

PostgreSQL / SQL Server

Time-Series Data

Evaluate PostgreSQL TimescaleDB or another appropriate time-series architecture.

Data Storage

Evaluate object storage for large waveform/spectrum files.

Visualization

Use a professional charting library capable of high-performance industrial vibration plots.

Authentication

Support enterprise authentication/SSO where required.

Do not select technology merely because it is popular. Explain the technical reason for each selection based on:

Performance

Maintainability

Security

Scalability

Vibration-data volume

Development effort

Forbes Marshall enterprise requirements

37. Expected Software Development Deliverables

Before coding, produce:

System architecture

User-role matrix

Functional requirements

Database ER diagram

API specification

UI wireframes

Data-flow diagram

Vibration-analysis workflow

Alert workflow

Report workflow

Development roadmap

Test strategy

Then implement the application incrementally.

38. Testing Requirements

Create test cases for:

Functional

User login

Machine creation

Data ingestion

Review

Alert

Report

Vibration Data

FFT calculation

RMS

Peak

Peak-to-peak

Frequency resolution

RPM

Trend calculation

Alarm threshold

Data Quality

Missing data

Invalid data

Sensor failure

Communication failure

Performance

Test with realistic vibration-data volumes.

Security

Test:

Unauthorized access

Role permissions

Customer data isolation

API security

39. Key Design Principle

The system is NOT simply a vibration graphing application.

It is a:

Vibration Monitoring + Analyst Workflow + Abnormality Management + Customer Reporting + Management Visibility Platform.

The most important objective is to answer these questions at any time:

Manager

Are all customer machines being monitored?

Did the engineers complete today's reviews?

Which machines are abnormal?

What did the analyst observe?

What action was recommended?

Has the customer been informed?

What actions are pending?

Which activities require my attention?

What reports have been generated?

What is the overall monitoring status?

Analyst

What machines do I need to review today?

What changed since the previous measurement?

Is the vibration increasing?

Is there a significant spectral change?

Is the condition normal or abnormal?

What evidence supports my observation?

What action should be recommended?

Does this require customer notification?

What follow-up is pending?

40. First Development Instruction

Before writing production code, do NOT immediately start coding.

First provide:

Proposed system architecture

Recommended technology stack

Database design

User-role matrix

Main screens

Dashboard layout

Daily analyst workflow

Manager workflow

Alert workflow

Report workflow

API architecture

Data-ingestion architecture

MVP scope

Phase-2 scope

Risks and dependencies

Questions/assumptions that require confirmation

After approval, implement the application module by module.

The software should be designed as a production-grade Forbes Marshall enterprise application, not as a prototype dashboard.

One important addition I recommend

Before you finalize this prompt, I would add a "Team Activity & Accountability" module as a first-class feature. This is what will let you actually supervise the two engineers rather than merely looking at machine data.

For example, your manager screen could look conceptually like:

Today – 22 Sep

KPIEngineer 1Engineer 2TeamMachines assigned423880Reviews completed353166Pending7714Abnormalities found325Alerts raised224Follow-ups pending437Reports generated101

Then below that:

🔴 Immediate Attention
Pump P-101 — High vibration trend — Engineer 1 — Customer action pending

🟠 Analyst Follow-up
Fan F-204 — Bearing-related indication — Engineer 2 — Review required tomorrow

⚪ Monitoring Gap
Compressor C-302 — No valid data received since 14:30

This gives you visibility of both the equipment and the work being performed by your monitoring team.so build software

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd200d6a-1272-4c49-84f5-36d0a5769001).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
