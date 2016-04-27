$(function(){

    window.app = undefined;

    var User = Backbone.Model.extend({
        defaults: {
            "username": "",
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
            return this.get("isChosen") && this.get("group") < this.collection.getCurrentVoteRound();
        },

        isInCurrentVoteRound: function(){
            return this.get("group") == this.collection.getCurrentVoteRound();
        },

        userHasVotedForThis: function(){
            return this.get("votes").indexOf(localStorage.getItem("username")) > -1;
        },

        getPercentVoted: function(){
            var totalVotes = 0;
            _.each(this.collection.getActivitiesByGroup(this.get("group")), function(model){
                totalVotes += model.get("votes").length;
            });
            try {
                return (this.get("votes").length / totalVotes) * 100;
            } catch(e){
                return 0;
            }
        }
    });

    var Activities = Backbone.Collection.extend({
        model: Activity,

        getCurrentVoteRound: function(){
            return this.max(function(model){
                return model.get("group");
            }).get("group");
        },

        getActivitiesByGroup: function(group){
            return this.filter(function(model){
                return model.get("group") == group;
            });
        }
    });

    var Adventure = Backbone.Model.extend({
        defaults: {
            name: ""
        },

        initialize: function(){
            this.set("users", new AdventureUsers());
            this.set("activities", new Activities());
        }
    });

    var App = Backbone.Marionette.Application.extend({
        initialize: function(options) {
            app = this;

            this.user = new User();
            this.adventure = new Adventure();

            this.layoutView = new ApplicationLayoutView();
            this.layoutView.render();

            this.layoutView.getRegion("header").show(new HeaderView());
            this.layoutView.getRegion("menu").show(new MenuView());

            this.listenTo(this.vent, "login", this.login);
            this.listenTo(this.vent, "login:success", this.loginSuccess);

            this.listenTo(this.vent, "createUser", this.createUser);
            this.listenTo(this.vent, "userCreated", this.userCreated);

            this.listenTo(this.vent, "createAdventure", this.createAdventure);
            this.listenTo(this.vent, "adventureCreated", this.adventureCreated);
            this.listenTo(this.vent, "inviteUser", this.inviteUser);
            this.listenTo(this.vent, "startNextActivity", this.startNextActivity);
            this.listenTo(this.vent, "submitVote", this.submitVote);

            this.listenTo(this.vent, "saveProfile", this.saveProfile);

            this.listenTo(this.vent, "showView", this.showView);

            if (
                localStorage.getItem("username") == null
                || localStorage.getItem("password") == null
            ){
                this.vent.trigger("showView", "login");
            } else {
                this.login({username: localStorage.getItem("username"), password: localStorage.getItem("password")});
            };

/*
            if (userData.username.length == 0){
                this.vent.trigger("showView", "login");
            } else {
                //this.vent.trigger("showView", "home");
                this.loadAdventure();
            }
*/
        },

        showView: function(view){
            var self = this;

            if (view == "home" && self.adventure.get("name").length > 0){
                view = "adventure";
            };

            var views = {
                "login": {
                    titleHtml: '<span style="font-weight: normal;">adventur</span><span style="font-weight: bold">US</span>',
                    backButton: false,
                    viewFunction: function(){ self.layoutView.getRegion("main").show(new LoginView({model: self.user})) }
                },
                "home": {
                    titleHtml: '<span style="font-weight: normal;">adventur</span><span style="font-weight: bold">US</span>',
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
                    backButton: false,
                    viewFunction: function(){
                        self.layoutView.getRegion("main").show(new AdventureView({model: self.adventure}));
                    }
                    //TODO: do menu options go here? or maybe the menu's model should be set to self.adventure?
                }
            };

            views[view].viewFunction();
            this.vent.trigger("viewChanged", views[view]);
        },

/*
        isLoggedIn: function(){
            var self = this;

            var result = false;

            $.ajax({
                url: "/api/is_logged_in/",
                type: "POST",
                success: function(response){
                    result = response;
                }
            });

            return result;
        },
*/

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
                    if (response){
                        self.vent.trigger("login:success", data);
                    } else {
                        self.vent.trigger("login:failed");
                    };
                }
            });
        },

        loginSuccess: function(data){
            localStorage.setItem("username", data.username);
            localStorage.setItem("password", data.password);

            this.loadAdventure();
        },

        createUser: function(data){
            var self = this;

            $.ajax({
                url: "/api/create_user/",
                type: "POST",
                data: {
                    username: data.username
                },
                success: function(data){
                    if (data){
                        self.vent.trigger("userCreated", data);
                    } else {
                        self.vent.trigger("userCreatedFailed", {errorMessage: data.errorMessage});
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
                    name: data.name
                },
                success: function(response){
                    if (response){
                        self.vent.trigger("adventureCreated", data);
                    } else {
                        //self.vent.trigger("userCreatedFailed", {errorMessage: data.errorMessage});
                    };
                }
            });
        },

        userCreated: function(data){
            this.user.set("username", data.username);
            this.user.set("id", data.id);
            this.vent.trigger("showView", "profile");
        },

        adventureCreated: function(data){
            this.adventure.set("name", data.name);
        },

        inviteUser: function(data){
           var self = this;

            $.ajax({
                url: "/api/invite_user/",
                type: "POST",
                data: {
                    username: data.username
                },
                success: function(response){
                    if (response){
                        self.vent.trigger("invite:success", {username: data.username});
                    } else {
                        //self.vent.trigger("userCreatedFailed", {errorMessage: data.errorMessage});
                    };
                }
            });
        },

        startNextActivity: function(data){
            $.ajax({
                url: "/api/start_next_activity/",
                type: "POST",
                data: {
                    //TODO
                },
                success: function(response){
                    console.log(response);
                    /*
                    if (response){
                        self.vent.trigger("invite:success", {username: data.username});
                    } else {
                        //self.vent.trigger("userCreatedFailed", {errorMessage: data.errorMessage});
                    };
                    */
                }
            });
        },

        submitVote: function(data){
            $.ajax({
                url: "/api/vote_activity/",
                type: "POST",
                data: {
                    id: data.id
                },
                success: function(response){
                    console.log(response);
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
                        //self.vent.trigger("userCreated", {username: data.username});
                    } else {
                        //self.vent.trigger("userCreatedFailed", {errorMessage: data.errorMessage});
                    };
                }
            });
        },

        loadProfile: function(){
            var self = this;

            $.ajax({
                url: "/api/load_profile/",
                data: {username: self.user.get("username")},
                success: function(data){
                    self.user.set("firstName", data.firstName);
                    self.user.set("lastName", data.lastName);
                    self.user.set("email", data.email);
                }
            });
        },

        loadAdventure: function(){
            var self = this;

            $.ajax({
                url: "/api/load_adventure/",
                success: function(data){
                    if (JSON.stringify(data) == "{}"){
                        self.vent.trigger("showView", "home");
                        return;
                    };
                    self.adventure.set({name: data.name});
                    self.adventure.set({host: data.host});

                    self.adventure.get("users").set(data.users);
                    self.adventure.get("activities").set(data.activities);

                    self.vent.trigger("showView", "adventure");
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
            app.vent.trigger("showView", $el.data("view"));
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

    var LoginView = Marionette.ItemView.extend({
        template: "#template-login",

        attributes: {
            class: "row"
        },

        events: {
            "submit .js-form-login": "login"
        },

        initialize: function(){
            //this.listenTo(app.vent, "userCreatedFailed", this.showError);
        },

        login: function(e){
            e.preventDefault();

            var $username = this.$el.find(".js-input-username");
            var $password = this.$el.find(".js-input-password");

            $username.prop("disabled", true);
            $password.prop("disabled", true);
            //this.$el.find(".js-btn-submit").prop("disabled", true).html("<i class='fa fa-spinner fa-spin'></i>");

            app.vent.trigger("login", {username: $username.val(), password: $password.val()});
        },

        showError: function(data){
            /*
            var $username = this.$el.find(".js-input-username");
            var $submit = this.$el.find(".js-btn-submit");

            console.warn(data);

            $submit.prop("disabled", false).html($submit.data("default"));
            $username.prop("disabled", false);

            this.$el.find("form").addClass("has-error");
            this.$el.find(".js-container-error-message").show().html("An error occurred");
            */
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
            "click .js-btn-new": "newAdventure"
        },

        newAdventure: function(){
            app.vent.trigger("showView", "adventure");
        }
    });

    var AdventureView = Marionette.LayoutView.extend({
        initialize: function(){
            var self = this;

            this.listenTo(this.model, "change", this.render);
            this.listenTo(app.vent, "adventureInviteView:input_not_empty", this.enableInviteUser);
            this.listenTo(app.vent, "adventureInviteView:input_empty", this.disableInviteUser);

            setTimeout(function(){ //TODO: is there a better way to do this?
                self.getRegion("users").show(new AdventureUsersView({collection: self.model.get("users")}));
                self.getRegion("activities").show(new ActivitiesLayoutView({collection: self.model.get("activities")}));
                //self.getRegion("host").show(new NewActivityChoicesView());

                if (self.model.get("host") != localStorage.getItem("username")){
                    self.$el.find(".js-btn-invite").hide();
                };

            }, 0);
        },

        template: "#template-adventure",

        regions: {
            users: "#region-adventure-users",
            activities: "#region-adventure-activities",
            host: "#region-adventure-host"
        },

        events: {
            "submit .js-form-adventure-name": "saveAdventureName",
            "click .js-btn-invite": "showInviteForm"
        },

        saveAdventureName: function(e){
            e.preventDefault();
            app.vent.trigger("createAdventure", {name: this.$el.find(".js-input-adventure-name").val()});
        },

        showInviteForm: function(e){
            var $el = $(e.target);
            if ($el.hasClass("cancel")){
                this.hideInviteForm();
            } else {
                this.getRegion("users").show(new AdventureUserInviteView());
                this.disableInviteUser();
            };
        },

        hideInviteForm: function(){
            this.getRegion("users").show(new AdventureUsersView({collection: app.adventure.get("users")}));
            this.enableInviteUser();
        },

        enableInviteUser: function(){
            this.$el.find(".js-btn-invite").removeClass("cancel");
            this.$el.find(".js-label-invite").html("Invite");
        },

        disableInviteUser: function(){
            this.$el.find(".js-btn-invite").addClass("cancel");
            this.$el.find(".js-label-invite").html("Cancel");
        }
    });

    var AdventureUserView = Marionette.ItemView.extend({
        template: "#template-adventure-user",

        attributes: {
            "class": "adventure-user"
        }
    });

    var AdventureUsersView = Marionette.CollectionView.extend({
        childView:  AdventureUserView
    });

    var AdventureUserInviteView = Marionette.ItemView.extend({
        template: "#template-adventure-invite",

        attributes: {
            "style": "float: left; margin-top: 12px; width: calc(100% - 80px);"
        },

        events: {
            "submit form": "inviteUser",
            "input input": "inputChanged"
        },

        inviteUser: function(e){
            e.preventDefault();

            this.$el.find(".js-input-username").prop("disabled", true);

            app.vent.trigger("inviteUser", {username: this.$el.find(".js-input-username").val()});
        },

        inputChanged: function(e){
            var $el = $(e.target);
            if ($el.val().length > 0){
                app.vent.trigger("adventureInviteView:input_not_empty");
            } else {
                app.vent.trigger("adventureInviteView:input_empty");
            }
        }
    });

    var ActivityHistoryView = Marionette.ItemView.extend({
        onBeforeRender: function(){
            if (this.model.hasWonPreviousVoteRound()){
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
        childViewContainer: ".js-activities"
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
                self.getRegion("history").show(new ActivitiesHistoryView({collection: self.collection}));
                self.getRegion("vote").show(new ActivitiesVoteView({collection: self.collection}));
            }, 0);
        }
    });

    var NewActivityChoicesView = Marionette.ItemView.extend({
        template: "#template-new-activity-choices",

        events: {
            "submit form": "startNextActivity"
        },

        startNextActivity: function(e){
            e.preventDefault();

            app.vent.trigger("startNextActivity", {}); //TODO: pass selected location/activity type choices
        }
    });

    new App();
});
