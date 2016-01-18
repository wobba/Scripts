// Author: Mikael Svenson - Puzzlepart 2016
// Twitter: @mikaelsvenson
/*
Description
-----------

Script which hooks into the query execution flow of a page using search web parts to inject custom query variables using JavaScript

<TODO: load of UPA>
<TODO: synonyms>

*/

(function ($) {
    "use strict";

    var loading = false;
    var userDefinedVariables = {};
    var synonymTable = {};
    var dataProviders = [];

    // Function to load user variables asynchronous
    function loadUserVariables() {
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
                        if (typeof val == "number" || typeof val == "string") {
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

    // Function to load synonyms asynchronous - poor mans synonyms
    function loadSynonyms() {
        var d = $.Deferred();
        //logic to fetch and add synonyms - could be from a list
        setTimeout(function () {
            synonymTable['color'] = ['red', 'blue'];
            synonymTable['"cool guy"'] = ['"mikael svenson"'];
            d.resolve();
        }, 2000);
        return d.promise();
    }

    // Function to inject synonyms at run-time
    function injectSynonyms(query, dataProvider) {
        // Remove complex query parts AND/OR/NOT/ANY/ALL/parenthasis/property queries/exclusions - can probably be improved            
        var cleanQuery = query.replace(/(-\w+)|(-"\w+.*?")|(-?\w+[:=<>]+\w+)|(-?\w+[:=<>]+".*?")|((\w+)?\(.*?\))|(AND)|(OR)|(NOT)/g, '');
        var queryParts = cleanQuery.match(/("[^"]+"|[^"\s]+)/g);
        var expansions = [];

        if (queryParts) {
            for (var i = 0; i < queryParts.length; i++) {
                if (synonymTable[queryParts[i]]) {
                    expansions.push.apply(expansions, synonymTable[queryParts[i]]);
                }
            }
        }
        if (expansions.length > 0) {
            dataProvider.get_properties()["mAdcOWSynonyms"] = expansions;
        } else {
            delete dataProvider.get_properties()["mAdcOWSynonyms"];
        }
    }

    // Function to inject custom variables on page load
    function injectCustomQueryVariables() {
        var queryGroups = Srch.ScriptApplicationManager.get_current().queryGroups;
        for (var group in queryGroups) {
            if (queryGroups.hasOwnProperty(group)) {
                var dataProvider = queryGroups[group].dataProvider;
                var properties = dataProvider.get_properties();
                // add all user variables fetched and stored as mAdcOWUser.
                for (var prop in userDefinedVariables) {
                    if (userDefinedVariables.hasOwnProperty(prop)) {
                        properties[prop] = userDefinedVariables[prop];
                    }
                }

                // add some custom variables
                dataProvider.get_properties()["awesomeness"] = "WOOOOOOT";
                dataProvider.get_properties()["moreawesomeness"] = ["foo", "bar"];

                // set hook for query time variables which can change
                dataProvider.add_queryIssuing(function (sender, e) {
                    injectSynonyms(e.queryState.k, sender);
                });

                dataProviders.push(dataProvider);
            }
        }
    }

    // Loader function to hook in client side custom query variables
    function hookCustomQueryVariables() {
        console.log("Hooking variable injection");

        var origExecuteQuery = Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery;
        var origExecuteQueries = Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQueries;

        Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery = function (query) {
            if (!loading) {
                loading = true;
                $.when(loadSynonyms(), loadUserVariables()).done(function () {
                    injectCustomQueryVariables();
                    //reset to original function
                    Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery = origExecuteQuery;
                    //issue query
                    for (var i = 0; i < dataProviders.length; i++) {
                        dataProviders[i].issueQuery();
                    }
                });
            }
        }

        Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQueries = function (queryIds, queries, handleExceptions) {
            if (!loading) {
                loading = true;
                $.when(loadSynonyms(), loadUserVariables()).done(function () {
                    injectCustomQueryVariables();
                    //reset to original function
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

