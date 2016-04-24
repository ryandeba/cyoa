import sys

from django.core import serializers
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
        "login": login_user,
        "create_user": create_user,
        "save_profile": save_profile,
        "load_profile": load_profile,
        "create_adventure": create_adventure,
        "load_adventure": load_adventure,
        "invite_user": invite_user,
    }
#    if request.method == "POST":
#        request.user = AppUser.objects.get(id=request.POST.get("id")).user
    responseData = methods[method](request)
    return HttpResponse(json.dumps(responseData), content_type="application/json")

def is_logged_in(request):
    return request.user.is_authenticated()

def login_user(request):
    username = request.POST.get('username')
    password = request.POST.get('password')

    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)
        AppUser.objects.get_or_create(user=user)
        return True
    return False

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
    adventure = Adventure.objects.create(name=request.POST.get("name"))
    AdventureUser.objects.create(adventure=adventure, user=request.user, is_host=True)
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

def joinAdventure(request): #add request.user to the adventure
    return []

def declineAdventure(request):
    return []

def load_adventure(request): #load adventure data for the adventure that the user is in (if applicable)
    try:
        adventure = Adventure.objects.get(adventureuser__user=request.user)
    except:
        return {}
    adventure_data = {
        "name": adventure.name,
        "users": serializers.serialize("json", adventure.adventureuser_set.all()),
        "activities": [],
    }
    return adventure_data

def invite_user(request): #load adventure data for the adventure that the user is in (if applicable)
    appUser = AppUser.objects.get(user__username=request.GET.get("username"))
#    adventure = Adventuer.objects.get(kj
#    adventureUser, created = AdventureUser.objects.get_or_create(adventure=adventure, user=.user)
    return appUser.user.username

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
