$(function(){

    window.app = undefined;

    var userData = {
        username: "{{ username }}"
    };

    var User = Backbone.Model.extend({
        defaults: {
            "id": undefined,
            "username": "ryandeba",
            "email": "",
            "firstName": "",
            "lastName": "",
            "gender": ""
        }
    });

    var Adventure = Backbone.Model.extend({
        defaults: {
            id: "",
            name: ""
        },

        initialize: function(){
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

            this.listenTo(this.vent, "createUser", this.createUser);
            this.listenTo(this.vent, "userCreated", this.userCreated);
            this.listenTo(this.vent, "createAdventure", this.createAdventure);
            this.listenTo(this.vent, "adventureCreated", this.adventureCreated);
            this.listenTo(this.vent, "saveProfile", this.saveProfile);
            this.listenTo(this.vent, "showView", this.showView);

            if (userData.username.length == 0){
                this.showLoginView();
            } else {
                this.showHomeView();
            }
        },

        showLoginView: function(){
            this.layoutView.getRegion("main").show(new LoginView({model: this.user}));
        },

        showProfileView: function(){
            this.loadProfile();
            this.layoutView.getRegion("main").show(new ProfileView({model: this.user}));
        },

        showHomeView: function(){
            this.layoutView.getRegion("main").show(new HomeView());
        },

        showNewAdventureView: function(){
            this.layoutView.getRegion("main").show(new NewAdventureView());
        },

        showInviteToAdventureView: function(){
            this.layoutView.getRegion("main").show(new AdventureView());
        },

        showView: function(view){
            if (view == "profile"){
                this.showProfileView();
            } else if (view == "home"){
                this.showHomeView();
            } else if (view == "newAdventure"){
                this.showNewAdventureView();
            };
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
            this.showProfileView();
        },

        adventureCreated: function(data){
            this.adventure.set("name", data.name);
            this.showInviteToAdventureView();
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
        template: "#template-header",

        events: {
            "click a": "anchorClicked",
            "click .navbar-toggle": "showMenu"
        },

        anchorClicked: function(e){
            e.preventDefault();
            var $el = $(e.target);
            app.vent.trigger("showView", $el.data("view"));
        },

        showMenu: function(e){
            e.stopPropagation();
            app.vent.trigger("showMenu");
        }
    });

    var MenuView = Marionette.ItemView.extend({

        initialize: function(){
            this.listenTo(app.vent, "showMenu", this.showMenu);
            this.listenTo(app.vent, "hideMenu", this.hideMenu);
        },

        template: "#template-menu",

        events: {
            "click": "menuClicked"
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
        template: "#template-create-user",

        attributes: {
            class: "row"
        },

        events: {
            "submit .js-form-create-user": "createUser"
        },

        initialize: function(){
            this.listenTo(app.vent, "userCreatedFailed", this.showError);
        },

        createUser: function(e){
            e.preventDefault();

            this.$el.find(".js-input-username").prop("disabled", true);
            this.$el.find(".js-btn-submit").prop("disabled", true).html("<i class='fa fa-spinner fa-spin'></i>");

            app.vent.trigger("createUser", {username: this.$el.find(".js-input-username").val()});
        },

        showError: function(data){
            var $username = this.$el.find(".js-input-username");
            var $submit = this.$el.find(".js-btn-submit");

            console.warn(data);

            $submit.prop("disabled", false).html($submit.data("default"));
            $username.prop("disabled", false);

            this.$el.find("form").addClass("has-error");
            this.$el.find(".js-container-error-message").show().html("An error occurred");
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
            app.vent.trigger("showView", "newAdventure");
        }
    });

    var NewAdventureView = Marionette.ItemView.extend({
        template: "#template-new-adventure-name",

        events: {
            "submit .js-form-adventure-name": "saveAdventureName"
        },

        saveAdventureName: function(e){
            e.preventDefault();
            app.vent.trigger("createAdventure", {name: this.$el.find(".js-input-adventure-name").val()});
        }
    });

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

    new App();
});
