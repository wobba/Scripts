(function () {
"use strict";
	function hideSettingsElementsOSSSearchResults() {        
		if (window.location.href.toLowerCase().indexOf("osssearchresults") != -1) {
			ExecuteOrDelayUntilBodyLoaded(function() {
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
					searchBox.set_showNavigation(false);
				});
			});
		}
	}
	// Register and run module after body is loaded
	ExecuteOrDelayUntilBodyLoaded(function() {
		if (typeof (_spBodyOnLoadCalled) === 'undefined' || _spBodyOnLoadCalled) {
			hideSettingsElementsOSSSearchResults();
			RegisterModuleInit(SP.Utilities.UrlBuilder.urlCombine(_spPageContextInfo.webServerRelativeUrl,'SiteAssets/mAdcOW.OSSSearchResultOverride.js'), hideSettingsElementsOSSSearchResults);
		}
		else {
			_spBodyOnLoadFunctions.push(hideSettingsElementsOSSSearchResults);
		}
	});
}());
