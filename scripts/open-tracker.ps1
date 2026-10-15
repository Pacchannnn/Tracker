$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$taskUrl = 'https://tracker-ppap7.vercel.app/'
$taskCredentialFile = Join-Path $env:LOCALAPPDATA 'TrackerPreview/wwcfzotkxpqtelfvvhpd/synthetic-accounts.dpapi'
$taskAccount = $null
if ([IO.File]::Exists($taskCredentialFile)) {
    $taskSecure = ConvertTo-SecureString ([IO.File]::ReadAllText($taskCredentialFile))
    $taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecure)
    try { $taskBundle = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer) | ConvertFrom-Json; $taskAccount = $taskBundle.accounts[0] }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer); $taskSecure.Dispose(); $taskBundle = $null }
}
$taskForm = New-Object System.Windows.Forms.Form
$taskForm.Text = 'Tracker - Open and sign in'
$taskForm.Size = New-Object System.Drawing.Size(650,365)
$taskForm.StartPosition = 'CenterScreen'
$taskForm.FormBorderStyle = 'FixedDialog'
$taskForm.MaximizeBox = $false
$taskForm.TopMost = $true
$taskDescription = New-Object System.Windows.Forms.Label
$taskDescription.Location = New-Object System.Drawing.Point(20,18)
$taskDescription.Size = New-Object System.Drawing.Size(600,78)
$taskDescription.Text = "Website: tracker-ppap7.vercel.app - opens directly without Vercel login.`r`nThis panel is optional, only for the existing cloud preview account.`r`nWebsite > Cai dat & sao luu > Dang nhap bang mat khau - Preview.`r`nSign in, then choose Mo du lieu tai khoan. Local history stays separate."
$taskForm.Controls.Add($taskDescription)
$taskEmailLabel = New-Object System.Windows.Forms.Label
$taskEmailLabel.Text = 'Email'
$taskEmailLabel.Location = New-Object System.Drawing.Point(20,108)
$taskForm.Controls.Add($taskEmailLabel)
$taskEmail = New-Object System.Windows.Forms.TextBox
$taskEmail.Location = New-Object System.Drawing.Point(20,130)
$taskEmail.Size = New-Object System.Drawing.Size(440,25)
$taskEmail.ReadOnly = $true
if ($taskAccount) { $taskEmail.Text = $taskAccount.email }
$taskForm.Controls.Add($taskEmail)
$taskCopyEmail = New-Object System.Windows.Forms.Button
$taskCopyEmail.Text = 'Copy email'
$taskCopyEmail.Location = New-Object System.Drawing.Point(475,126)
$taskCopyEmail.Size = New-Object System.Drawing.Size(140,31)
$taskCopyEmail.Enabled = [bool]$taskAccount
$taskCopyEmail.Add_Click({ [System.Windows.Forms.Clipboard]::SetText($taskEmail.Text) })
$taskForm.Controls.Add($taskCopyEmail)
$taskPasswordLabel = New-Object System.Windows.Forms.Label
$taskPasswordLabel.Text = 'Password (stored encrypted on this Windows account)'
$taskPasswordLabel.Location = New-Object System.Drawing.Point(20,172)
$taskPasswordLabel.Size = New-Object System.Drawing.Size(580,20)
$taskForm.Controls.Add($taskPasswordLabel)
$taskPassword = New-Object System.Windows.Forms.TextBox
$taskPassword.Location = New-Object System.Drawing.Point(20,195)
$taskPassword.Size = New-Object System.Drawing.Size(440,25)
$taskPassword.ReadOnly = $true
$taskPassword.UseSystemPasswordChar = $true
if ($taskAccount) { $taskPassword.Text = $taskAccount.password }
$taskForm.Controls.Add($taskPassword)
$taskAccount = $null
$taskCopyPassword = New-Object System.Windows.Forms.Button
$taskCopyPassword.Text = 'Copy password'
$taskCopyPassword.Location = New-Object System.Drawing.Point(475,191)
$taskCopyPassword.Size = New-Object System.Drawing.Size(140,31)
$taskCopyPassword.Enabled = $taskPassword.Text.Length -gt 0
$taskCopyPassword.Add_Click({ [System.Windows.Forms.Clipboard]::SetText($taskPassword.Text) })
$taskForm.Controls.Add($taskCopyPassword)
$taskOpen = New-Object System.Windows.Forms.Button
$taskOpen.Text = 'OPEN TRACKER'
$taskOpen.Location = New-Object System.Drawing.Point(20,245)
$taskOpen.Size = New-Object System.Drawing.Size(250,42)
$taskOpen.Add_Click({ Start-Process $taskUrl })
$taskForm.Controls.Add($taskOpen)
$taskStatus = New-Object System.Windows.Forms.Label
$taskStatus.Location = New-Object System.Drawing.Point(285,247)
$taskStatus.Size = New-Object System.Drawing.Size(330,64)
$taskStatus.Text = 'Preview only. Cross-device data/photo transfer has not been verified. Do not upload personal health data for this preview handoff.'
if (-not $taskCopyPassword.Enabled) { $taskStatus.Text = 'Saved preview credentials are unavailable on this Windows account. Local Tracker still works without an account.' }
$taskForm.Controls.Add($taskStatus)
$taskForm.Add_FormClosed({ $taskEmail.Clear(); $taskPassword.Clear() })
try { [void]$taskForm.ShowDialog() }
finally { $taskPassword.Clear(); $taskEmail.Clear(); $taskForm.Dispose() }
