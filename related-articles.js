// Author: Mikael Svenson - @mikaelsvenson - http://techmikael.blogspot.com/

// This script requires jQuery to be loaded
(function ($) {

    // Take all terms on the form Parent:Child:Child and split it to the form 1:Parent, 2:Child, 3:Child
    function buildTermArray(tags) {
        var termsLabels = new Array();
        for (var i = 0; i < tags.get_count() ; i++) {
            var termsLabel = tags.getItemAtIndex(i).get_label();
            termsLabels.push(termsLabel);
        }

        var uniqueTerms = new Array();
        for (var i = 0; i < termsLabels.length; i++) {
            var parts = termsLabels[i].split(":");
            for (var j = 0; j < parts.length; j++) {
                // Adding position to indicate what is parent and children.
                // Will use position later to boost childterm/most specific term more
                var posLabel = (j + 1) + ":" + parts[j];
                if ($.inArray(posLabel, uniqueTerms) == -1) {
                    uniqueTerms.push(posLabel);
                }
            }
        }
        uniqueTerms.sort().reverse();
        return uniqueTerms;
    }

    // Create a KQL OR query based on the output from buildTermArray()
    function createQuery(queryTerms, mpPrefix) {
        //queryTerms -> ["2:Finance", "1:News"]
        var orTerms = new Array();
        for (var i = 0; i < queryTerms.length; i++) {
            var parts = queryTerms[i].split(":");
            var labelQuery = mpPrefix + ":\"" + parts[1] + "\"";
            orTerms.push(labelQuery);
        }
        return orTerms.join(" ");
        //kqlQuery -> owstaxIdTopic:"Finance" owstaxIdTopic:"News"
    }

    // Create a KQL XRANK query based on the parent/child term labels
    function createXrankQuery(kqlQuery, queryTerms, mpPrefix, boostMultiplier) {
        if (queryTerms.length == 0) return kqlQuery;
        var xRankTerms = new Array();
        for (var i = 0; i < queryTerms.length; i++) {
            var parts = queryTerms[i].split(":");
            var labelQuery = mpPrefix + ':"' + parts[1] + '"';
            var cbRank = parts[0] * boostMultiplier;
            xRankTerms.push("XRANK(cb=" + cbRank + ") " + labelQuery);
        }
        for (var i = 0; i < xRankTerms.length; i++) {
            kqlQuery = "(" + kqlQuery + ") " + xRankTerms[i];
        }
        // submit an app is the more specific term and is boosted more than the parent term
        //((owstaxIdTopic:"Finance" owstaxIdTopic:"News") XRANK(cb=2000) owstaxIdTopic:"Finance") XRANK(cb=1000) owstaxIdTopic:"News"    
        return kqlQuery;
    }

    function getRelatedItems() {
        var context = SP.ClientContext.get_current();

        var web = context.get_web();
        var currentList = web.get_lists().getById(_spPageContextInfo.pageListId);
        var currentListItem = currentList.getItemById(_spPageContextInfo.pageItemId);
        context.load(currentListItem);
        context.executeQueryAsync(
            function () {
                var parentTopicTags = currentListItem.get_item("Topic");
                var audienceRoleTags = currentListItem.get_item("Audience");
                var productsTags = currentListItem.get_item("Classification");

                var queryTerms = buildTermArray(parentTopicTags);
                // Limit on the current list and path and exlude the current item
                var kql = "\"IsDocument:\"True\" -ListItemId=" + _spPageContextInfo.pageItemId + " ListId:\"" + _spPageContextInfo.pageListId + "\"" + "path:\"" + _spPageContextInfo.siteAbsoluteUrl;

                // Add topic OR query
                kql = kql + " " + createQuery(queryTerms, "owstaxIdTopic");
                // Add topic XRANK query. Topic is most important
                kql = createXrankQuery(kql, queryTerms, "owstaxIdTopic", 1000);
                // Add audience XRANK query. Audience is second most important
                queryTerms = buildTermArray(audienceRoleTags);
                kql = createXrankQuery(kql, queryTerms, "owstaxIdAudience", 100); // add boost to items with the same role(s)
                // Add classification XRANK query. Classification is third most important
                queryTerms = buildTermArray(productsTags);
                kql = createXrankQuery(kql, queryTerms, "owstaxIdClassification", 10); // add boost to items with the same products(s)

                console.log("Query for related items: " + kql);
                // Add the properties you need for your rendering
                executeQuery(kql, 'Title;Url');
            },
            function () {
                alert('An error occured.');
            }
        );
    }

    function executeQuery(queryText, queryProperties) {
        SP.SOD.executeFunc('SP.Search.js', 'Microsoft.SharePoint.Client.Search.Query', function () {
            var propertiesToAdd = queryProperties.split(";");
            var context = SP.ClientContext.get_current();

            var keywordQuery = new Microsoft.SharePoint.Client.Search.Query.KeywordQuery(context);
            keywordQuery.set_clientType("ContentSearchRegular"); // see http://techmikael.blogspot.com/2015/05/always-set-client-type-on-sharepoint.html
            keywordQuery.set_queryText(queryText);

            var properties = keywordQuery.get_selectProperties();
            for (i = 0; i < propertiesToAdd.length; i++) {
                properties.add(propertiesToAdd[i]);
            }

            keywordQuery.set_rowLimit(10);
            var searchExecutor = new Microsoft.SharePoint.Client.Search.Query.SearchExecutor(context);
            results = searchExecutor.executeQuery(keywordQuery);
            context.executeQueryAsync(onQuerySuccess, onQueryError);
        });
    }

    function onQuerySuccess() {
        // ID container where you want to append the results in the DOM -in this case an <ul id="RelatedContent" />
        var relatedContentElement = $('#RelatedContent'); 
        relatedContentElement.empty(); // clear it to be sure - 
        if (results.m_value.ResultTables) {
            $.each(results.m_value.ResultTables, function (index, table) {
                if (table.TableType == "RelevantResults") {
                    if (results.m_value.ResultTables[index].ResultRows.length > 0) {
                        $.each(results.m_value.ResultTables[index].ResultRows, function () {
                            $("<li><a href='" + this.Url + "' Title='" + this.Title + "'>" + this.Title + "</a></li>").appendTo(relatedContentElement);
                        });
                    }
                }
            });
        }
    }

    function onQueryError() {
        alert('onQueryError');
    }

    $(document).ready(function () {
        SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {
            SP.SOD.registerSod('sp.taxonomy.js', SP.Utilities.Utility.getLayoutsPageUrl('sp.taxonomy.js'));
            SP.SOD.executeFunc('sp.taxonomy.js', 'SP.Taxonomy.TaxonomySession', function () {
                getRelatedItems();
            });
        });
    });

})(jQuery);
