import sys
 
from django.shortcuts import render
from django.http import HttpResponse

import json

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from models import AppUser, Adventure, AdventureUser

def index(request):
    requestData = {
        "user": request.user,
        "username": request.user.username,
    }
    return render(request, 'cyoa/index.html', requestData)

def api(request, method):
    methods = {
        "is_logged_in": is_logged_in,
        "create_user": create_user,
        "save_profile": save_profile,
        "load_profile": load_profile,
        "create_adventure": create_adventure,
        "load_adventure": load_adventure,
    }
#    if request.method == "POST":
#        request.user = AppUser.objects.get(id=request.POST.get("id")).user
    responseData = methods[method](request)
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def is_logged_in(request):
    return request.user.is_authenticated()

def create_user(request):
    try:
        username= request.POST.get('username')

        appUser = AppUser.objects.create()
        password = appUser.id

        user = User.objects.create_user(username=username, password=password) #TODO: can I just save a user without a password?
        appUser.user = user
        appUser.save()

        user = authenticate(username=username, password=password)
        if user is not None:
            login(request, user)
            return {
                "username": username,
                "id": str(password),
            }
    except:
        pass
    return False

def create_adventure(request):
    adventure = Adventure.objects.create(name=request.GET.get("name"))
    AdventureUser.objects.create(adventure=adventure, is_host=True)
    AdventureUser.objects.create(adventure=adventure, is_host=True)
    return True

def save_profile(request):
    user = User.objects.get(username=request.POST.get("username"))
    user.first_name = request.POST.get("firstName")
    user.last_name = request.POST.get("lastName")
    user.email = request.POST.get("email")
    user.save()
    return True

def load_profile(request):
    user = User.objects.get(username=request.GET.get("username"))
    return {
        "firstName": user.first_name,
        "lastName": user.last_name,
        "email": user.email,
    }

def createAdventure(request): #create new adventure, set the user as the host
    #adventure = Adventure.objects.create()
    return [
        {
            "userID": request.user.id,
            #"adventureID": adventure.id
        }
    ]

def joinAdventure(request): #add request.user to the adventure
    return []

def declineAdventure(request):
    return []

def loadAdventure(request): #load adventure data for the adventure that the user is in (if applicable)
    return {
        "name": "adventure name",
        "users": {},
        "activities": [
            { #previously selected activity
                "name": "activity name",
                "url": "url",
                "maps_url": "maps_url",
                "facebook_url": "facebook_url",
            },
            [ #current activity to vote on
                {
                    "name": "activity 1",
                    "votes": 0,
                },
                {
                    "name": "activity 2",
                    "votes": 1,
                },
                {
                    "name": "activity 3",
                    "votes": 2,
                },
            ],
        ],
    }
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def startNextActivity(request): #(HOST) pass the location and activity type selections, create activityAdventures
    return []

def endVoting(request): #(HOST)
    return []

def endAdventure(request): #(HOST) set date_finished on the adventure
    return []

def voteActivity(request):
    return []

def loadFinishedAdventures(request):
    return []
