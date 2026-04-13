 
 $PSScriptRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
 
 Write-Host $PSScriptRoot
