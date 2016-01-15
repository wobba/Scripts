// http://osl1799/sites/search/_vti_bin/listdata.svc/UserInformationList?$filter=Id eq 2
//<script type="text/javascript" src="//code.jquery.com/jquery-1.12.0.min.js"></script>
//<script type="text/javascript">
(function ($) {
    "use strict";

    var loading = false;
    var userDefinedVariables = {};
    var dataProviders = [];

    function loadUserVariables() {
        loading = true;
        var d = $.Deferred();
        SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {
            // Query user hidden list - not accessible via REST
            // If you want TERM guid's you need to mix and match the use of UserProfileManager and TermStore and cache client side
            var urlCurrentUser = _spPageContextInfo.siteAbsoluteUrl + "/_vti_bin/listdata.svc/UserInformationList?$filter=Id eq " + _spPageContextInfo.userId;

            $.getJSON(urlCurrentUser).done(function (data) {
                var user = data['d']['results'][0];
                for (var property in user) {
                    if (user.hasOwnProperty(property)) {
                        var val = user[property];
                        if ( typeof val == "number" || typeof val == "string") {
                            console.log(property + " : " + val);
                            userDefinedVariables["mAdcOWUser." + property] = val;
                        }
                    }
                }                
                d.resolve();
            }).fail(function () {
                d.reject();
            });
        });
        return d.promise();
    }

    function injectCustomQueryVariables() {
        var queryGroups = Srch.ScriptApplicationManager.get_current().queryGroups;
        for (var group in queryGroups) {
            if (queryGroups.hasOwnProperty(group)) {
                var dataProvider = queryGroups[group].dataProvider;
                var properties = dataProvider.get_properties();
                for (var prop in userDefinedVariables) {
                    if (userDefinedVariables.hasOwnProperty(prop)) {
                        properties[prop] = userDefinedVariables[prop];
                    }
                }
                dataProvider.get_properties()["awesomeness"] = "WOOOOOOT";
                dataProvider.get_properties()["moreawesomeness"] = ["foo", "bar"];

                dataProviders.push(dataProvider);
            }
        }
    }

    function hookCustomQueryVariables() {
        console.log("Hooking variable injection");

        var origExecuteQuery = Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery;
        var origExecuteQueries = Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQueries;

        Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery = function () {
            if (!loading) {
                loadUserVariables().done(function () {
                    injectCustomQueryVariables();
                    //reset function
                    Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery = origExecuteQuery;
                    //issue query
                    for (var i = 0; i < dataProviders.length; i++) {
                        dataProviders[i].issueQuery();
                    }
                });
            }
        }

        Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQueries = function () {
            if (!loading) {
                loadUserVariables().done(function () {
                    injectCustomQueryVariables();
                    //reset function
                    Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQueries = origExecuteQueries;
                    //issue query
                    for (var i = 0; i < dataProviders.length; i++) {
                        dataProviders[i].issueQuery();
                    }
                });
            }
        }
    }

    ExecuteOrDelayUntilBodyLoaded(function () {
        Sys.Application.add_init(hookCustomQueryVariables);
    });
}(jQuery));
//</script>
