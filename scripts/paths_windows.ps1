# scripts/paths_windows.ps1
# 统一管理 Windows 脚本的文件目录 Path 变量
# 所有 Windows 脚本通过 dot-source 引入:
#   . "$PSScriptRoot\paths_windows.ps1"
#
# ProjectDir = 项目根目录 (scripts/ 的父目录)

$ProjectDir = Split-Path -Parent $PSScriptRoot

# ==========================================
# 1. 源码目录 (src-tauri/)
# ==========================================
$SrcTauriDir          = Join-Path $ProjectDir "src-tauri"
$BinariesDir          = Join-Path $SrcTauriDir "binaries"
$NsisDir              = Join-Path $SrcTauriDir "nsis"
$ResourcesDir         = Join-Path $SrcTauriDir "resources"
$NodejsDir            = Join-Path $ResourcesDir "nodejs"
$TauriConfPath        = Join-Path $SrcTauriDir "tauri.conf.json"
$CargoTomlPath        = Join-Path $SrcTauriDir "Cargo.toml"

# ==========================================
# 2. 运行时依赖 (bundled)
# ==========================================
$BunBinaryPath        = Join-Path $BinariesDir "bun-x86_64-pc-windows-msvc.exe"
$GitInstallerPath     = Join-Path $NsisDir "Git-Installer.exe"
$NodejsExePath        = Join-Path $NodejsDir "node.exe"
$VcRuntime140         = Join-Path $ResourcesDir "vcruntime140.dll"
$VcRuntime140_1      = Join-Path $ResourcesDir "vcruntime140_1.dll"

# ==========================================
# 3. 前端 / npm
# ==========================================
$PackageJsonPath      = Join-Path $ProjectDir "package.json"
$EnvFilePath          = Join-Path $ProjectDir ".env"

# ==========================================
# 4. 服务端构建产物 (src-tauri/resources/)
# ==========================================
$ServerDistPath       = Join-Path $ResourcesDir "server-dist.js"
$PluginBridgeDistPath = Join-Path $ResourcesDir "plugin-bridge-dist.js"
$ClaudeSdkDir         = Join-Path $ResourcesDir "claude-agent-sdk"
$AgentBrowserCliDir   = Join-Path $ResourcesDir "agent-browser-cli"

# ==========================================
# 5. 构建输出 (src-tauri/target/) — 注意：build_windows.ps1 内部也有同名变量
# ==========================================
$TargetBaseDir        = Join-Path $SrcTauriDir "target"
$TargetRelease        = Join-Path $TargetBaseDir "x86_64-pc-windows-msvc\release"
$TargetNsisDir        = Join-Path $TargetRelease "bundle\nsis"
$ResourcesCacheDir    = Join-Path $TargetRelease "resources"

# ==========================================
# 6. src/server 源码 (build 时引用)
# ==========================================
$ServerIndexTs        = Join-Path $ProjectDir "src\server\index.ts"
$AgentBrowserLockDir   = Join-Path $ProjectDir "src\server\agent-browser-lockfile"
$SdkSrcDir            = Join-Path $ProjectDir "node_modules\@anthropic-ai\claude-agent-sdk"

# ==========================================
# 7. 其他脚本
# ==========================================
$BuildScriptPath      = Join-Path $ProjectDir "scripts\build\build_windows.ps1"
$UploadGhScriptPath   = Join-Path $ProjectDir "scripts\publish\upload_github_release_win.ps1"

# ==========================================
# 9. 工作区
# ==========================================
$WorkspaceDir          = Join-Path $ProjectDir "nova"

# ==========================================
# 10. 其他工具
# ==========================================
$RclonePath           = Join-Path $ProjectDir "rclone.exe"
