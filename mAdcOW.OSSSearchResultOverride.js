"use strict";
(function () {
	function hideSettingsElementsOSSSearchResults() {
		ExecuteOrDelayUntilBodyLoaded(function() {
			if (window.location.href.toLowerCase().indexOf("osssearchresults") != -1) {
				SP.SOD.executeFunc("search.clientcontrols.js", "Srch.ScriptApplicationManager", function() {
					var scriptManager = Srch.ScriptApplicationManager.get_current();
					var searchControls = scriptManager.queryGroups["Default"].displays;
					for (var i = 0; i < searchControls.length; i++) {
						if (searchControls[i] instanceof Srch.Result) {
							searchControls[i].set_showUpScopeMessage(false);
							searchControls[i].set_showLanguageOptions(false);                        
							break;
						}
					}
					var searchBox = scriptManager.queryGroups["Default"].searchBoxes[0];
					//searchBox.set_showNavigation(false);
				});
			}
		});
	}
	
	ExecuteOrDelayUntilBodyLoaded(function() {
		try{
			if (typeof (_spBodyOnLoadCalled) === 'undefined' || _spBodyOnLoadCalled) {
				// make sure we are called after the controls are initialized, but before rendered
				Sys.Application.add_init(hideSettingsElementsOSSSearchResults);
				RegisterModuleInit(SP.Utilities.UrlBuilder.urlCombine(_spPageContextInfo.webServerRelativeUrl,'SiteAssets/mAdcOW.OSSSearchResultOverride.js'), hideSettingsElementsOSSSearchResults);
			}
			else {
				// make sure we are called after the controls are initialized, but before rendered
				Sys.Application.add_init(hideSettingsElementsOSSSearchResults);
			}
		} catch(e) {}
	});
}());
