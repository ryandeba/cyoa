import sys

from django.core import serializers
from django.shortcuts import render
from django.http import HttpResponse

import json

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from models import AppUser, Adventure, AdventureUser, Activity, AdventureActivity, AdventureActivityVote

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
        "start_next_activity": start_next_activity,
        "vote_activity": vote_activity,
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

def accept_adventure(request):
    return False

def decline_adventure(request):
    return False

def load_adventure(request):
    try:
        adventure = Adventure.objects.get(adventureuser__user=request.user)
    except:
        return {}
    adventure_data = {
        "name": adventure.name,
        "host": adventure.adventureuser_set.get(is_host=True).user.username,
        "users": [
            {
                "username": adventureUser.user.username
            } for adventureUser in adventure.adventureuser_set.all()
        ],
        "activities": [
            {
                "id": adventureActivity.id,
                "activityTypeKey": adventureActivity.activity.activityType.key,
                "name": adventureActivity.activity.name,
                "url": "",
                "mapsUrl": "",
                "facebookUrl": "",

                "group": adventureActivity.group,
                "isChosen": False,
                "votes": [
                    adventureActivityVote.user.username for adventureActivityVote in adventureActivity.adventureactivityvote_set.all()
                ]
            } for adventureActivity in adventure.adventureactivity_set.all()
        ],
    }
    return adventure_data

def invite_user(request): #load adventure data for the adventure that the user is in (if applicable)
    appUser = AppUser.objects.get(user__username=request.POST.get("username"))
    adventure = Adventure.objects.get(adventureuser__user=request.user)
    adventureUser, created = AdventureUser.objects.get_or_create(adventure=adventure, user=appUser.user)
    return True

def start_next_activity(request):
    #TODO: use the filters/activity types posted to filter random choices. related - do we allow duplicates? what happens when you get to the end?
    adventure = Adventure.objects.get(adventureuser__user=request.user)

    for activity in Activity.objects.order_by('?')[:3]:
        AdventureActivity.objects.create(adventure=adventure, activity=activity, group=1)

    return True

def vote_activity(request):
    adventure = Adventure.objects.get(adventureuser__user=request.user)
    adventureActivity =  adventure.adventureactivity_set.get(id=request.POST.get("id"))
    AdventureActivityVote.objects.get_or_create(adventureActivity=adventureActivity, user=request.user)
    return True

def voteActivity(request):
    return []

def end_voting(request): #(HOST)
    return []

def endAdventure(request): #(HOST) set date_finished on the adventure
    return []
