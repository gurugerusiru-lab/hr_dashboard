# HR Dashboard

Windows desktop HR analytics dashboard built with Electron.

## Current draft

- Import HR data from `.xlsx`, `.xls`, or `.csv`
- Automatically map common HR column headings
- Store imported records locally on the Windows PC
- Dashboard KPIs and workforce analytics
- Department, status, location, gender, and joining trends
- Searchable/filterable employee directory
- No employee data is committed to GitHub

## Run locally

1. Install Node.js LTS.
2. Clone this repository.
3. Run:

```bash
npm install
npm start
```

## Build a Windows installer

```bash
npm install
npm run dist
```

The Windows installer will be created in the `dist` directory.

## HR Excel columns

The importer recognises several common variants for fields such as:

- Employee ID
- Employee Name
- Department
- Designation / Job Title
- Join Date
- Employment Status
- Location
- Gender
- Salary
- Email
- Manager
- Date of Birth
- Employment Type

Exact customer-specific mappings can be added later.

## Data privacy

Imported HR files and local employee data are intentionally excluded from source control. Do not commit real employee information to this repository.
