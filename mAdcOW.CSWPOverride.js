// Author: Mikael Svenson - @mikaelsvenson
// techmikael.blogspot.com
"use strict";
(function () {
    function changeMaxResults() {
        var magicNumber = 42;
        var newMax = 500;
		ExecuteOrDelayUntilBodyLoaded(function() {
			SP.SOD.executeFunc("search.clientcontrols.js", "Srch.ScriptApplicationManager", function() {
				var scriptManager = Srch.ScriptApplicationManager.get_current();
				for (var queryGroupName in scriptManager.queryGroups) {
				    var queryGroup = scriptManager.queryGroups[queryGroupName];
				    if(queryGroup.dataProvider) {
				        var currentCount = queryGroup.dataProvider.get_resultsPerPage();
				        if( currentCount === magicNumber) {
				            queryGroup.dataProvider.set_resultsPerPage(newMax); // set the query to retreive 500 items per page
                            var searchControls = queryGroup.displays;
                            for (var i = 0; i < searchControls.length; i++) {
                                if (searchControls[i] instanceof Srch.ContentBySearch) {
                                    searchControls[i].set_numberOfItems(newMax); // set CSWP to show 500 items per page
                                    break;
                                }
                            }

                        }
				    }
			    }
			});
		});
	}
	
	ExecuteOrDelayUntilBodyLoaded(function() {
		try{
			if (typeof (_spBodyOnLoadCalled) === 'undefined' || _spBodyOnLoadCalled) {
				// make sure we are called after the controls are initialized, but before rendered
				Sys.Application.add_init(changeMaxResults);
				RegisterModuleInit(SP.Utilities.UrlBuilder.urlCombine(_spPageContextInfo.webServerRelativeUrl,'SiteAssets/mAdcOW.OSSSearchResultOverride.js'), changeMaxResults);
			}
			else {
				// make sure we are called after the controls are initialized, but before rendered
				Sys.Application.add_init(changeMaxResults);
			}
		} catch(e) {}
	});
}());
