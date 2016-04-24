$(function(){

    window.app = undefined;

    var userData = {
        username: "{{ username }}" //TODO: fix this. see "ryandeba" hack below
    };

    var User = Backbone.Model.extend({
        defaults: {
            "username": "ryandeba",
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

    var Adventure = Backbone.Model.extend({
        defaults: {
            id: "",
            name: "",
            users: []
        },

        initialize: function(){
            this.set("users", new AdventureUsers());
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
                    titleHtml: '<span style="font-weight: bold;">Adventur</span><span style="font-weight: normal">Us</span>',
                    backButton: false,
                    viewFunction: function(){ self.layoutView.getRegion("main").show(new LoginView({model: self.user})) }
                },
                "home": {
                    titleHtml: '<span style="font-weight: bold;">Adventur</span><span style="font-weight: normal">Us</span>',
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
                success: function(data){
                    if (data){
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

                    self.adventure.get("users").set(data.users); //TODO: django is passing this as a string and backbone seems to be handling it, but...can it be passed down as an array instead?
                    console.log(self.adventure.get("users"));
                    //TODO: set users and other data

                    self.vent.trigger("showView", "adventure"); //TODO: this is going to be problematic...maybe this is controlled by a flag?
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
                self.getRegion("users").show(new AdventureUsersView({collection: app.adventure.get("users")}));
            }, 0);
        },

        template: "#template-adventure",

        regions: {
            users: "#region-adventure-users",
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
            //"submit .js-form-create-user": "inviteUser",
            "input input": "inputChanged"
        },

        inviteUser: function(e){
            e.preventDefault();

            this.$el.find(".js-input-username").prop("disabled", true);
            //this.$el.find(".js-btn-submit").prop("disabled", true).html("<i class='fa fa-spinner fa-spin'></i>");

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

/*
    var AdventureView = Marionette.ItemView.extend({
        template: "#template-adventure",

        events: {
            "click .js-btn-invite": "toggleInvite",
            "click .js-btn-user": "toggleUser"
        },

        toggleInvite: function(){
            this.$el.find(".js-container-invite").slideToggle();
        },

        toggleUser: function(){
            //if the user is the host, then show options to remove user
        }
    });
*/

    new App();
});
