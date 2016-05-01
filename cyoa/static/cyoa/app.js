$(function(){
    var viewportHeight = $(window).height();
    $("body").css("min-height", viewportHeight);
});

$(function(){

    window.app = undefined;

    var User = Backbone.Model.extend({
        defaults: {
            "username": "",
            "token": "",
            "email": "",
            "firstName": "",
            "lastName": "",
            "gender": ""
        },

        idAttribute: "username"
    });

    var AdventureUsers = Backbone.Collection.extend({
        model: User
    });

    var Activity = Backbone.Model.extend({
        defaults: {
            activityTypeKey: "",
            name: "",
            url: "",
            mapsUrl: "",
            facebookUrl: "",

            group: 0,
            isChosen: false,
            votes: [] //array of usernames
        },

        initialize: function(){
        },

        hasWonPreviousVoteRound: function(){
            return this.get("isChosen") && this.get("group") < this.collection.getCurrentVoteGroup();
        },

        hasWonCurrentRound: function(){
            return this.get("isChosen") && this.get("group") == this.collection.getCurrentVoteGroup();
        },

        isInCurrentVoteRound: function(){
            return this.get("group") == this.collection.getCurrentVoteGroup() && !this.collection.currentRoundOfVotingHasEnded();
        },

        userHasVotedForThis: function(){
            return this.get("votes").indexOf(app.user.get("username")) > -1;
        },

        getPercentVoted: function(){
            var totalVotes = 0;
            _.each(this.collection.getActivitiesByGroup(this.get("group")), function(model){
                totalVotes += model.get("votes").length;
            });
            try {
                var percent = (this.get("votes").length / totalVotes) * 100;
                percent = isNaN(percent) ? 0 : percent
                return percent;
            } catch(e){
                return 0;
            }
        }
    });

    var Activities = Backbone.Collection.extend({
        model: Activity,

        getCurrentVoteGroup: function(){
            try {
                var maxGroup = this.max(function(model){
                    return model.get("group");
                }).get("group");
                return maxGroup;
            } catch(e){
                console.warn("current vote group could not be determined", e);
            }
            return 0;
        },

        getActivitiesByGroup: function(group){
            return this.filter(function(model){
                return model.get("group") == group;
            });
        },

        currentRoundOfVotingHasEnded: function(){
            var currentGroup = this.getCurrentVoteGroup();
            return this.filter(function(model){
                return model.get("group") == currentGroup && model.get("isChosen") == true;
            }).length != 0;
        }
    });

    var Adventure = Backbone.Model.extend({
        defaults: {
            name: "",
            host: "",
            isFinished: false
        },

        initialize: function(){
            this.set("users", new AdventureUsers());
            this.set("activities", new Activities());
        },

        userIsHost: function(){
            return this.get("host") == app.user.get("username") || this.get("host") == "";
        },

        canStartNextRoundOfVoting: function(){
            return this.get("isFinished") == false
                && this.userIsHost()
                && (
                    this.get("activities").length == 0
                    || this.get("activities").currentRoundOfVotingHasEnded()
                );
        },

        canVoteOnNextActivity: function(){
            return this.get("activities").length > 0 && this.get("activities").currentRoundOfVotingHasEnded() == false;
        },

        waitingOnHostToStartNextActivity: function(){
            return this.userIsHost() == false && true; //TODO
        },

        canEndAdventure: function(){
            return this.get("isFinished") == false && this.userIsHost();
        }
    });

    var Adventures = Backbone.Collection.extend({
        model: Adventure
    });

    var Achievement = Backbone.Model.extend({
    });

    var Achievements = Backbone.Collection.extend({
        model: Achievement
    });

    var App = Backbone.Marionette.Application.extend({
        initialize: function(options) {
            app = this;

            //TODO: move all of the view stuff into ApplicationLayoutView

            this.user = new User();
            if (localStorage.getItem("token") != null){
                this.user.set("token", localStorage.getItem("token"));
            };
            this.listenTo(this.user, "change:token", function(){ localStorage.setItem("token", app.user.get("token")); });
            this.adventure = new Adventure();
            this.loadAdventureTimeout = undefined;

            this.completedAdventures = new Adventures();
            this.achievements = new Achievements();

            this.currentView = "";

            this.layoutView = new ApplicationLayoutView();
            this.layoutView.render();

            this.layoutView.getRegion("header").show(new HeaderView());
            this.layoutView.getRegion("menu").show(new MenuView());
            this.layoutView.getRegion("error").show(new ErrorView());

            this.listenTo(this.vent, "validateLogin:success", this.loadAdventure);
            this.listenTo(this.vent, "validateLogin:failed", function(){ app.showView("login"); });

            this.listenTo(this.vent, "login", this.login);
            this.listenTo(this.vent, "login:success", this.loginSuccess);
            this.listenTo(this.vent, "login:failed", this.loginFailed);

            this.listenTo(this.vent, "createUser", this.createUser);
            this.listenTo(this.vent, "createUser:success", this.createUserSuccess);
            this.listenTo(this.vent, "createUser:failed", this.createUserFailed);

            this.listenTo(this.vent, "createAdventure", this.createAdventure);
            this.listenTo(this.vent, "adventureCreated", this.adventureCreated);

            this.listenTo(this.vent, "inviteUser", this.inviteUser);
            this.listenTo(this.vent, "invite:success", this.inviteUserSuccess);

            this.listenTo(this.vent, "startNextActivity", this.startNextActivity);
            this.listenTo(this.vent, "startNextActivity:success", this.loadAdventure);

            this.listenTo(this.vent, "submitVote", this.submitVote);
            this.listenTo(this.vent, "submitVote:success", this.loadAdventure);

            this.listenTo(this.vent, "endAdventure", this.endAdventure);
            this.listenTo(this.vent, "endAdventure:success", this.loadAdventure);

            this.listenTo(this.vent, "saveProfile", this.saveProfile);

            this.listenTo(this.vent, "showView", this.showView);

            this.listenTo(this.vent, "action", this.takeAction);

            this.vent.trigger("showView", "loading");

            this.validateLogin();

/*
            if (this.user.get("username").length > 0 && this.user.get("password").length > 0 && false){
                this.login({username: this.user.get("username"), password: this.user.get("password")});
            } else {
                this.vent.trigger("showView", "login");
            };

            this.loadCompletedAdventures();
            this.loadAchievements();
*/
        },

        showView: function(view){
            var self = this;

            if (view == "home" && self.adventure.get("name").length > 0){
                view = "adventure";
            };

            if (this.currentView == view){
                return;
            };

            var defaultTitleHtml = '<img src="/static/cyoa/logo_text.svg" style="display: inline-block; width: 110px; padding-bottom: 4px;">';
            var views = {
                "loading": {
                    titleHtml: 'Loading...',
                    backButton: false,
                    viewFunction: function(){ self.layoutView.getRegion("main").show(new LoadingView()) }
                },
                "login": {
                    titleHtml: defaultTitleHtml,
                    backButton: false,
                    viewFunction: function(){ self.layoutView.getRegion("main").show(new LoginView({model: self.user})) }
                },
                "home": {
                    titleHtml: defaultTitleHtml,
                    backButton: false,
                    viewFunction: function(){ self.layoutView.getRegion("main").show(new HomeView()); }
                },
                "profile": {
                    titleHtml: 'Profile',
                    backButton: true,
                    viewFunction: function(){
                        self.loadProfile();
                        self.layoutView.getRegion("main").show(new ProfileView({model: self.user}));
                    }
                },
                "adventure": {
                    titleHtml: self.adventure.get("name"),
                    backButton: false, //TODO: this should be true when creating a new adventure
                    viewFunction: function(){
                        self.layoutView.getRegion("main").show(new AdventureLayoutView({model: self.adventure}));
                    }
                    //TODO: do menu options go here? or maybe the menu's model should be set to self.adventure? or self!
                },
                "completedAdventures": {
                    titleHtml: "Completed Adventures",
                    backButton: true,
                    viewFunction: function(){
                        self.layoutView.getRegion("main").show(new CompletedAdventuresView({collection: self.completedAdventures}));
                    }
                },
                "achievements": {
                    titleHtml: "Achievements",
                    backButton: true,
                    viewFunction: function(){
                        self.layoutView.getRegion("main").show(new AchievementsView({collection: self.achievements}));
                    }
                }
            };

            views[view].viewFunction();
            this.currentView = view;
            this.vent.trigger("viewChanged", views[view]);
        },

        takeAction: function(action){
            if (action == "logout"){
                localStorage.clear();
                window.location.href = window.location.href;
            };
        },

        validateLogin: function(){
            var self = this;

            $.ajax({
                url: "/api/validate_login/",
                type: "POST",
                data: {
                    token: app.user.get("token")
                },
                success: function(response){
                    if (response.success){
                        self.user.set("username", response.data.username);
                        self.vent.trigger("validateLogin:success");
                    } else {
                        self.vent.trigger("validateLogin:failed");
                    };
                }
            });
        },

        login: function(data){
            var self = this;

            $.ajax({
                url: "/api/login/",
                type: "POST",
                data: {
                    username: data.username,
                    password: data.password
                },
                success: function(response){
                    console.log(response);
                    if (response.success){
                        app.user.set("username", response.data.username);
                        app.user.set("token", response.data.token)
                        self.vent.trigger("login:success");
                    } else {
                        self.vent.trigger("login:failed");
                    };
                }
            });
        },

        loginSuccess: function(data){
            this.loadAdventure();
        },

        loginFailed: function(data){
            this.vent.trigger("error", "Invalid username or password");
        },

        createUser: function(data){
            var self = this;

            $.ajax({
                url: "/api/create_user/",
                type: "POST",
                data: {
                    username: data.username,
                    password: data.password
                },
                success: function(response){
                    if (response.success){
                        self.user.set("username", response.data.username);
                        self.user.set("token", response.data.token);
                        self.vent.trigger("createUser:success");
                    } else {
                        self.vent.trigger("createUser:failed", {errorMessage: response.error_message});
                    };
                }
            });
        },

        createAdventure: function(data){
            var self = this;

            $.ajax({
                url: "/api/create_adventure/",
                type: "POST",
                data: {
                    token: app.user.get("token"),
                    name: data.name
                },
                success: function(response){
                    if (response.success){
                        self.vent.trigger("adventureCreated");
                    } else {
                    };
                }
            });
        },

        createUserSuccess: function(data){
            this.vent.trigger("showView", "profile");
        },

        createUserFailed: function(data){
            this.vent.trigger("error", data.errorMessage);
        },

        adventureCreated: function(data){
            this.loadAdventure();
        },

        inviteUser: function(data){
           var self = this;

            $.ajax({
                url: "/api/invite_user/",
                type: "POST",
                data: {
                    token: app.user.get("token"),
                    username: data.username
                },
                success: function(response){
                    if (response.success){
                        self.vent.trigger("invite:success");
                    } else {
                    };
                }
            });
        },

        inviteUserSuccess: function(){
            this.adventure.get("users").trigger("change"); //triggering a change event to hide the invite user form
            this.loadAdventure();
        },

        startNextActivity: function(data){
            $.ajax({
                url: "/api/start_next_activity/",
                type: "POST",
                data: {
                    token: app.user.get("token")
                    //TODO: add location/activity type options
                },
                success: function(response){
                    if (response.success){
                        app.vent.trigger("startNextActivity:success");
                    };
                }
            });
        },

        submitVote: function(data){
            $.ajax({
                url: "/api/vote_activity/",
                type: "POST",
                data: {
                    token: app.user.get("token"),
                    id: data.id
                },
                success: function(response){
                    if (response.success){
                        app.vent.trigger("submitVote:success");
                    };
                }
            });
        },

        endAdventure: function(){
            $.ajax({
                url: "/api/end_adventure/",
                type: "POST",
                data: {
                    token: app.user.get("token"),
                },
                success: function(response){
                    if (response.success){
                        app.vent.trigger("endAdventure:success");
                    };
                }
            });
        },
 
        saveProfile: function(){
            var self = this;

            $.ajax({
                url: "/api/save_profile/",
                type: "POST",
                data: self.user.toJSON(),
                success: function(data){
                    if (data){
                    } else {
                    };
                }
            });
        },

        loadProfile: function(){
            var self = this;

            $.ajax({
                url: "/api/load_profile/",
                type: "POST",
                data: {
                    token: app.user.get("token")
                },
                success: function(response){
                    self.user.set("firstName", response.data.firstName);
                    self.user.set("lastName", response.data.lastName);
                    self.user.set("email", response.data.email);
                }
            });
        },

        loadAdventure: function(){
            var self = this;

            clearTimeout(self.loadAdventureTimeout);

            $.ajax({
                url: "/api/load_adventure/",
                type: "POST",
                data: {
                    token: app.user.get("token")
                },
                success: function(response){
                    if (JSON.stringify(response.data.adventure_data) == "{}"){
                        self.adventure.set(self.adventure.defaults);
                        self.vent.trigger("showView", "home");
                        return;
                    };
                    self.adventure.set("name", response.data.adventure_data.name);
                    self.adventure.set("host", response.data.adventure_data.host);
                    self.adventure.set("isFinished", response.data.adventure_data.isFinished);

                    self.adventure.get("users").set(response.data.adventure_data.users);
                    self.adventure.get("activities").set(response.data.adventure_data.activities);

                    self.vent.trigger("showView", "adventure");

                    if (self.adventure.get("isFinished") == false){
                        self.loadAdventureTimeout = setTimeout(function(){
                            self.loadAdventure();
                        }, 5000);
                    };
                }
            });
        },

        loadCompletedAdventures: function(){
            var self = this;

            $.ajax({
                url: "/api/load_completed_adventures/",
                success: function(data){
                    console.log("loadCompletedAdventures", data);
                    self.completedAdventures.set(data);
                }
            });
        },

        loadAchievements: function(){
            var self = this;

            $.ajax({
                url: "/api/load_achievements/",
                success: function(data){
                    self.achievements.set(data);
                }
            });
        }

    });

    var ApplicationLayoutView = Marionette.LayoutView.extend({
        initialize: function(){
            $(document).on("click", function(){
                app.vent.trigger("hideMenu");
            });
        },

        el: "body",

        template: "#template-application",

        regions: {
            header: "#region-header",
            menu: "#region-menu",
            error: "#region-error",
            main: "#region-main"
        },

    });

    var HeaderView = Marionette.ItemView.extend({
        initialize: function(){
            this.listenTo(app.vent, "viewChanged", this.viewChanged);
        },

        template: "#template-header",

        events: {
            "click .navbar-toggle": "showMenu",
            "click .navbar-back": "goBack"
        },

        viewChanged: function(data){
            this.$el.find(".navbar-brand").html(data.titleHtml);
            this.$el.find(".navbar-toggle").toggle(!data.backButton);
            this.$el.find(".navbar-back").toggle(data.backButton);
        },

        showMenu: function(e){
            e.stopPropagation();
            app.vent.trigger("showMenu");
        },

        goBack: function(e){
            e.stopPropagation();
            app.vent.trigger("showView", "home");
        }
    });

    var MenuView = Marionette.ItemView.extend({

        initialize: function(){
            this.listenTo(app.vent, "showMenu", this.showMenu);
            this.listenTo(app.vent, "hideMenu", this.hideMenu);

            //this.listenTo(app.vent, "viewChanged", this.viewChanged);
        },

        template: "#template-menu",

        events: {
            "click button": "selectMenuOption"
        },

        selectMenuOption: function(e){
            e.preventDefault();
            var $el = $(e.target);
            if ($el.data("view") != undefined){
                app.vent.trigger("showView", $el.data("view"));
            }
            if ($el.data("action") != undefined){
                app.vent.trigger("action", $el.data("action"));
            }
        },

        menuClicked: function(e){
            e.stopPropagation();
        },

        hideMenu: function(){
            this.$el.parent().addClass("collapsed");
        },

        showMenu: function(){
            this.$el.parent().removeClass("collapsed");
        }

    });

    var ErrorView = Marionette.ItemView.extend({
        template: "#template-noop",

        initialize: function(){
            this.hideErrorTimeout = undefined;

            this.listenTo(app.vent, "error", this.showError);
        },

        showError: function(errorMessage){
            //TODO: figure out what we're doing about errors and then fix this mess

            this.$el.html(errorMessage);
            $("#region-error").addClass("visible");

            clearTimeout(this.hideErrorTimeout);
            this.hideErrorTimeout = setTimeout(function(){
                $("#region-error").removeClass("visible");
            }, 3000);
        }
    });

    var LoadingView = Marionette.ItemView.extend({
        template: "#template-noop"
    });

    var LoginView = Marionette.ItemView.extend({
        template: "#template-login",

        initialize: function(){
            this.listenTo(app.vent, "login:failed", this.enableForm);
            this.listenTo(app.vent, "createUser:failed", this.enableForm);
        },

        events: {
            "submit .js-form-login": "submitLogin",
            "click .js-btn-login": "login",
            "click .js-btn-create": "createNewAccount"
        },

        login: function(){
            this.$el.find(".js-input-login-type").val("login");
            this.$el.find("form").submit();
        },

        createNewAccount: function(){
            this.$el.find(".js-input-login-type").val("create");
            this.$el.find("form").submit();
        },

        submitLogin: function(e){
            e.preventDefault();

            var $username = this.$el.find(".js-input-username");
            var $password = this.$el.find(".js-input-password");

            $username.prop("disabled", true);
            $password.prop("disabled", true);

            if (this.$el.find(".js-input-login-type").val() == "login"){
                app.vent.trigger("login", {username: $.trim($username.val()), password: $.trim($password.val())});
            } else {
                app.vent.trigger("createUser", {
                    username: $.trim($username.val()),
                    password: $.trim($password.val())
                });
            }
        },

        enableForm: function(){
            var $username = this.$el.find(".js-input-username");
            var $password = this.$el.find(".js-input-password");

            $username.prop("disabled", false);
            $password.prop("disabled", false);
        }
    });

    var ProfileView = Marionette.ItemView.extend({
        template: "#template-profile",

        events: {
            "change input": "change",
            "submit .js-form-profile": "saveProfile"
        },

        initialize: function(){
            this.listenTo(this.model, "change", this.render);
        },

        change: function(e){
            var $el = $(e.target);
            this.model.set($el.data("field"), $el.val(), {silent: true});
        },

        saveProfile: function(e){
            e.preventDefault();
            app.vent.trigger("saveProfile");
        }
    });

    var HomeView = Marionette.ItemView.extend({
        template: "#template-home",

        events: {
            "click .js-btn-new": "newAdventure",
            "click .js-btn-completed": "completedAdventures",
            "click .js-btn-achievements": "achievements"
        },

        newAdventure: function(){
            app.vent.trigger("showView", "adventure");
        },

        completedAdventures: function(){
            app.vent.trigger("showView", "completedAdventures");
        },

        achievements: function(){
            app.vent.trigger("showView", "achievements");
        }
    });

    var AdventureLayoutView = Marionette.LayoutView.extend({
        initialize: function(){
            var self = this;

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model.get("users"), "change", this.hideInviteForm);
        },

        onRender: function(){
            var self = this;

            if (self.model.get("name").length > 0){
                self.getRegion("users").show(new AdventureUsersView({model: self.model, collection: self.model.get("users")}));
                //self.getRegion("activities").show(new ActivitiesLayoutView({collection: self.model.get("activities")}));
                self.getRegion("activities").show(new ActivitiesLayoutView({model: self.model}));
                self.getRegion("opts").show(new AdventureOptionsView({model: self.model}));
            };

            console.log("render AdventureLayoutView");
        },

        template: "#template-adventure",

        regions: {
            users: "#region-adventure-users",
            activities: "#region-adventure-activities",
            opts: "#region-adventure-options" //can't call it options :(
        },

        events: {
            "submit .js-form-adventure-name": "saveAdventureName"
        },

        saveAdventureName: function(e){
            e.preventDefault();
            app.vent.trigger("createAdventure", {name: this.$el.find(".js-input-adventure-name").val()});
        }
    });

    var CompletedAdventureView = Marionette.ItemView.extend({
        template: "#template-completed-adventure"
    });

    var CompletedAdventuresView = Marionette.CompositeView.extend({
        template: "#template-completed-adventures",

        childView: CompletedAdventureView,

        childViewContainer: ".js-adventures"
    });

    var AdventureUserView = Marionette.ItemView.extend({
        template: "#template-adventure-user",

        attributes: {
            "class": "adventure-user"
        }
    });

    var AdventureUsersView = Marionette.CompositeView.extend({
        template: "#template-adventure-users",

        childView:  AdventureUserView,

        childViewContainer:  ".js-container-adventure-users",

        events: {
            "submit form": "inviteUser",
            "click .js-btn-invite": "toggleInviteForm"
        },

        initialize: function(){
            this.showInviteForm = false;
            this.listenTo(this.collection, "change", this.render);
            this.listenTo(app.vent, "inviteUser:success", this.toggleInviteForm);
        },

        serializeData: function(){
            var data = this.model.toJSON();
            data.userIsHost = this.model.userIsHost();
            data.showInviteForm = this.showInviteForm;
            return data;
        },

        onRender: function(){
            this.$el.find(this.childViewContainer).toggle(!this.showInviteForm);
        },

        inviteUser: function(e){
            e.preventDefault();

            this.$el.find(".js-input-username").prop("disabled", true);

            app.vent.trigger("inviteUser", {username: this.$el.find(".js-input-username").val()});
        },

        toggleInviteForm: function(show){
            show = show == undefined ? !this.showInviteForm : show;
            this.showInviteForm = show;
            this.render();
        }
    });

    var ActivityHistoryView = Marionette.ItemView.extend({
        onBeforeRender: function(){
            if (this.model.hasWonPreviousVoteRound() || this.model.hasWonCurrentRound()){
                this.template = "#template-adventure-activity";
            } else {
                this.template = "#template-noop";
            };
        }
    });

    var ActivitiesHistoryView = Marionette.CollectionView.extend({
        childView: ActivityHistoryView
    });

    var ActivityVoteView = Marionette.ItemView.extend({
        onBeforeRender: function(){
            if (this.model.isInCurrentVoteRound()){
                this.template = "#template-adventure-activity-vote";
            } else {
                this.template = "#template-noop";
            };
        },

        serializeData: function(){
            var data = this.model.toJSON();
            data.userHasVotedForThis = this.model.userHasVotedForThis();
            data.percentVoted = this.model.getPercentVoted();
            return data;
        },

        events: {
            "click": "vote"
        },

        vote: function(){
            app.vent.trigger("submitVote", {id: this.model.get("id")});
        }
    });

    var ActivitiesVoteView = Marionette.CompositeView.extend({
        template: "#template-adventure-activities-vote",

        childView: ActivityVoteView,

        childViewContainer: ".js-activities",

        initialize: function(){
            this.listenTo(this.collection, "change", this.render);
        },

        serializeData: function(){
            var data = this.model.toJSON();
            data.canVoteOnNextActivity = this.model.canVoteOnNextActivity();
            data.waitingOnHostToStartNextActivity = this.model.waitingOnHostToStartNextActivity();
            return data;
        }
    });

    var ActivitiesLayoutView = Marionette.LayoutView.extend({
        template: "#template-adventure-activity-layout",

        regions: {
            history: "#region-activity-history",
            vote: "#region-activity-vote"
        },

        initialize: function(){
            var self = this;
            setTimeout(function(){
                self.getRegion("history").show(new ActivitiesHistoryView({collection: self.model.get("activities")}));
                if (self.model.get("isFinished") == false){
                    self.getRegion("vote").show(new ActivitiesVoteView({model: self.model, collection: self.model.get("activities")}));
                };
            }, 0);
        }
    });

    var AdventureOptionsView = Marionette.ItemView.extend({
        template: "#template-adventure-options",

        events: {
            "click .js-btn-choose-activity-options": "chooseActivityOptions",
            "submit form": "startNextActivity",
            "click .js-btn-end-adventure": "endAdventure",
            "click .js-btn-end-adventure-confirm": "confirmEndAdventure",
            "click .js-btn-end-adventure-cancel": "cancelEndAdventure"
        },

        chooseActivityOptions: function(){
            this.$el.find(".js-container-start-next-activity-button").hide();
            this.$el.find(".js-container-start-next-activity-options").show();
        },

        startNextActivity: function(e){
            e.preventDefault();

            app.vent.trigger("startNextActivity", {}); //TODO: pass selected location/activity type choices
        },

        endAdventure: function(){
            this.$el.find(".js-container-end-adventure-button").hide();
            this.$el.find(".js-container-end-adventure-confirm").show();
        },

        confirmEndAdventure: function(){
            app.vent.trigger("endAdventure");
        },

        cancelEndAdventure: function(){
            this.$el.find(".js-container-end-adventure-button").show();
            this.$el.find(".js-container-end-adventure-confirm").hide();
        },

        serializeData: function(){
            var data = this.model.toJSON();
            data.canStartNextRoundOfVoting = this.model.canStartNextRoundOfVoting();
            data.canEndAdventure = this.model.canEndAdventure();
            return data;
        }
    });

    var AchievementView = Marionette.ItemView.extend({
        template: "#template-achievement"
    });

    var AchievementsView = Marionette.CompositeView.extend({
        template: "#template-achievements",

        childView: AchievementView,

        childViewContainer: ".js-achievments"
    });



    new App();
});
