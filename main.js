const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

let mainWindow;

function getDataPath() {
  return path.join(app.getPath('userData'), 'hr-dashboard-data.json');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-/.()]+/g, '');
}

const aliases = {
  employeeId: ['employeeid', 'empid', 'staffid', 'id', 'employeeno', 'employeenumber'],
  name: ['employeename', 'fullname', 'name', 'staffname'],
  department: ['department', 'dept', 'division', 'businessunit', 'businessarea'],
  designation: ['designation', 'jobtitle', 'position', 'role', 'title'],
  joinDate: ['joindate', 'joiningdate', 'dateofjoining', 'hiredate', 'startdate', 'employmentdate'],
  status: ['status', 'employmentstatus', 'employeestatus'],
  location: ['location', 'office', 'site', 'branch', 'worklocation'],
  gender: ['gender', 'sex'],
  salary: ['salary', 'basicsalary', 'monthlysalary', 'grosssalary', 'basesalary'],
  email: ['email', 'emailaddress', 'workemail', 'officialemail'],
  manager: ['manager', 'linemanager', 'reportingmanager', 'supervisor', 'reportsto'],
  dateOfBirth: ['dateofbirth', 'dob', 'birthdate'],
  employmentType: ['employmenttype', 'contracttype', 'employeetype', 'worktype']
};

function findColumn(headers, candidates) {
  const normalized = headers.map(h => ({ raw: h, norm: normalizeKey(h) }));
  const found = normalized.find(h => candidates.includes(h.norm));
  return found ? found.raw : null;
}

function excelDateToISO(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return String(value);
}

function mapRows(rows) {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const mapping = {};
  Object.entries(aliases).forEach(([field, candidates]) => {
    mapping[field] = findColumn(headers, candidates);
  });

  return rows.map((row, index) => ({
    _rowId: index + 1,
    employeeId: mapping.employeeId ? String(row[mapping.employeeId] ?? '') : '',
    name: mapping.name ? String(row[mapping.name] ?? '') : '',
    department: mapping.department ? String(row[mapping.department] ?? '') : '',
    designation: mapping.designation ? String(row[mapping.designation] ?? '') : '',
    joinDate: mapping.joinDate ? excelDateToISO(row[mapping.joinDate]) : '',
    status: mapping.status ? String(row[mapping.status] ?? '') : 'Active',
    location: mapping.location ? String(row[mapping.location] ?? '') : '',
    gender: mapping.gender ? String(row[mapping.gender] ?? '') : '',
    salary: mapping.salary ? Number(row[mapping.salary]) || 0 : 0,
    email: mapping.email ? String(row[mapping.email] ?? '') : '',
    manager: mapping.manager ? String(row[mapping.manager] ?? '') : '',
    dateOfBirth: mapping.dateOfBirth ? excelDateToISO(row[mapping.dateOfBirth]) : '',
    employmentType: mapping.employmentType ? String(row[mapping.employmentType] ?? '') : '',
    _raw: row
  })).filter(r => r.employeeId || r.name);
}

ipcMain.handle('import-hr-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import HR Data',
    properties: ['openFile'],
    filters: [
      { name: 'HR Data', extensions: ['xlsx', 'xls', 'csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) return { canceled: true };

  try {
    const filePath = result.filePaths[0];
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    const employees = mapRows(rows);
    const payload = {
      sourceFile: path.basename(filePath),
      importedAt: new Date().toISOString(),
      employees
    };
    fs.writeFileSync(getDataPath(), JSON.stringify(payload, null, 2), 'utf8');
    return { canceled: false, ...payload };
  } catch (error) {
    return { canceled: false, error: error.message };
  }
});

ipcMain.handle('load-local-data', async () => {
  try {
    const dataPath = getDataPath();
    if (!fs.existsSync(dataPath)) return null;
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('clear-local-data', async () => {
  try {
    const dataPath = getDataPath();
    if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
