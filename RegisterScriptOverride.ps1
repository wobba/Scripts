[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Client")
[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Client.Runtime")


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
    $actions | ForEach-Object { Delete-Action -UserCustomAction $_  } 

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
}


$siteUrl = 'https://<yourtentant>.sharepoint.com/sites/<yoursite>'
$context = New-Object Microsoft.SharePoint.Client.ClientContext($siteUrl)
# SPO credentials
$context.Credentials = Get-SPOCredentials -UserName mikael.svenson@puzzlepart.com
# Use ~SiteCollection if you uploaded to the root site 
$scriptUrl = '~Site/SiteAssets/mAdcOW.OSSSearchResultOverride.js'

Add-ScriptLinkAction -Context $context -ScriptSrc $scriptUrl -Sequence 1000 -Name override
