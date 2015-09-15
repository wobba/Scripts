param (
	[Parameter(Mandatory=$True)]
	[string]$SiteUrl='https://<yourtentant>.sharepoint.com/sites/<yoursite>',
	[string]$SchemaPath = './VSDXSearchConfiguration.xml'
)

[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Client") | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Client.Runtime") | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Client.Search") | Out-Null


Function Get-SPOCredentials([string]$UserName,[string]$Password)
{
   if([string]::IsNullOrEmpty($Password)) {
      $SecurePassword = Read-Host -Prompt "Enter the password" -AsSecureString 
   }
   else {
      $SecurePassword = $Password | ConvertTo-SecureString -AsPlainText -Force
   }
   return New-Object Microsoft.SharePoint.Client.SharePointOnlineCredentials($UserName, $SecurePassword)
}

Function Get-ActionByName([Microsoft.SharePoint.Client.ClientContext]$Context,[string]$Name)
{
     $customActions = $Context.Site.UserCustomActions
     $Context.Load($customActions)
     $Context.ExecuteQuery()
     $customActions | where { $_.Name -eq $Name }
}

Function Delete-Action([Microsoft.SharePoint.Client.UserCustomAction]$UserCustomAction)
{
     $Context = $UserCustomAction.Context
     $UserCustomAction.DeleteObject()
     $Context.ExecuteQuery()
}

Function Add-ScriptLinkAction([Microsoft.SharePoint.Client.ClientContext]$Context,[string]$ScriptSrc,[string]$ScriptBlock,[int]$Sequence,[string]$Name)
{
    $actions = Get-ActionByName -Context $Context -Name $Name
    $actions | ForEach-Object { Write-Host "Removing existing action $Name" -ForeGroundColor Yellow;  Delete-Action -UserCustomAction $_  } 
	
    $action = $Context.Site.UserCustomActions.Add();
    $action.Location = "ScriptLink"
    if($ScriptSrc) {
        $action.ScriptSrc = $ScriptSrc
    }
    if($ScriptBlock) {
        $action.ScriptBlock = $ScriptBlock
    }
	$action.Name = $Name
    $action.Sequence = $Sequence
    $action.Update()
    $Context.ExecuteQuery()
	Write-Host "Added script registration $Name" -ForegroundColor Green
}

Function Import-SearchSchema([Microsoft.SharePoint.Client.ClientContext]$Context,[string]$SchemaPath)
{
	$searchConfigurationPortability = New-Object Microsoft.SharePoint.Client.Search.Portability.SearchConfigurationPortability($context)
	$owner = New-Object Microsoft.SharePoint.Client.Search.Administration.SearchObjectOwner($Context,"SPSite")
	[xml]$schema = gc $SchemaPath
	$searchConfigurationPortability.ImportSearchConfiguration($owner,$schema.OuterXml)
	$Context.ExecuteQuery()
	Write-Host "Importing search schema to site collection - $SchemaPath" -ForegroundColor Green

}

Function Upload-FileToSiteAssets([Microsoft.SharePoint.Client.ClientContext]$Context,[string]$FileName){
    $list = $Context.Web.Lists.GetByTitle("Site Assets");
    $Context.Load($list.RootFolder);
    $Context.ExecuteQuery();
	$fileUrl = $list.RootFolder.ServerRelativeUrl + '/' + $FileName;
	
	#$fi = new-Object IO.FileInfo $FileName

	$scriptPath = Split-Path -Parent $PSCommandPath
	$fs = New-Object IO.FileStream "$scriptPath/$FileName", 'Open'
	[Microsoft.SharePoint.Client.File]::SaveBinaryDirect($Context, $fileUrl, $fs, $true)
	$fs.Dispose()
	Write-Host "Uplaoded file to Site Assets - $FileName" -ForegroundColor Green
}

$context = New-Object Microsoft.SharePoint.Client.ClientContext($SiteUrl)
# SPO credentials
#$context.Credentials = Get-SPOCredentials -UserName mikael.svenson@puzzlepart.com
# Use ~SiteCollection if you uploaded to the root site 
$scriptUrl = '~SiteCollection/SiteAssets/mAdcOW.VisioOverride.js'

Upload-FileToSiteAssets -Context $context -FileName 'mAdcOW.VisioOverride.js'

Add-ScriptLinkAction -Context $context -ScriptSrc $scriptUrl -Sequence 1000 -Name visiopatch

Import-SearchSchema -Context $context -SchemaPath $SchemaPath