import sys

from functools import wraps

from django.core import serializers
from django.shortcuts import render
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Max

import json

from datetime import datetime

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User

from models import AppUser, Adventure, AdventureUser, Activity, AdventureActivity, AdventureActivityVote

def index(request):
    requestData = {
        "user": request.user,
        "username": request.user.username,
    }
    return render(request, 'cyoa/index.html', requestData)

def api(request, method):
    methods = {
        "validate_login": validate_login,
        "login": login_user,
        "create_user": create_user,
        "save_profile": save_profile,
        "load_profile": load_profile,
        "create_adventure": create_adventure,
        "load_adventure": load_adventure,
        "load_completed_adventures": load_completed_adventures,
        "invite_user": invite_user,
        "start_next_activity": start_next_activity,
        "vote_activity": vote_activity,
        "end_adventure": end_adventure,
        "load_achievements": load_achievements,
    }
    request.response = {
        "success": True,
        "error_message": "",
        "data": {},
    }
    responseData = methods[method](request)
    return HttpResponse(json.dumps(request.response), content_type="application/json")

def require_authentication(f):
    @wraps(f)
    def wrapper(*args, **kwargs):

        request = args[0]
        token = request.POST.get('token')
        appUser = None
        try:
            appUser = AppUser.objects.get(id=token)
            request.user = appUser.user
        except:
            request.response["success"] = False
            request.response["error_message"] = "Authentication Error"
            return

        return f(*args, **kwargs)
    return wrapper

def validate_login(request):
    token = request.POST.get('token')
    appUser = None
    try:
        appUser = AppUser.objects.get(id=token)
        request.response["data"] = {
            "username": appUser.user.username
        }
    except:
        pass
    if appUser is None:
        request.response["success"] = False

def login_user(request):
    username = request.POST.get('username')
    password = request.POST.get('password')

    user = authenticate(username=username, password=password)
    if user is not None:
        appUser, created = AppUser.objects.get_or_create(user=user)
        request.response["data"] = {
            "username": username,
            "token": str(appUser.id),
        }
        return
    request.response["success"] = False
    request.response["error_message"] = "Login Error"

def create_user(request):
    try:
        username= request.POST.get('username')
        password= request.POST.get('password')

        user = authenticate(username=username, password=password)
        if user is None:
            user = User.objects.create_user(username=username, password=password)

        appUser, created = AppUser.objects.get_or_create(user=user)
        appUser.save()

        if user is not None:
            request.response["data"] = {
                "username": username,
                "token": str(appUser.id),
            }
    except:
        request.response["success"] = False
        request.response["error_message"] = "Could not create user"

@require_authentication
def create_adventure(request):
    try:
        adventure = Adventure.objects.create(name=request.POST.get("name"))
        AdventureUser.objects.create(adventure=adventure, user=request.user, is_host=True)
    except:
        request.response["success"] = False
        request.response["error_message"] = "An error occurred creating the adventure"

@require_authentication
def save_profile(request):
    try:
        request.user.first_name = request.POST.get("firstName")
        request.user.last_name = request.POST.get("lastName")
        request.user.email = request.POST.get("email")
        request.user.save()
    except:
        request.response["success"] = False
        request.response["error_message"] = "An error occurred saving profile data"

@require_authentication
def load_profile(request):
    request.response["data"] = {
        "firstName": request.user.first_name,
        "lastName": request.user.last_name,
        "email": request.user.email,
    }

@require_authentication
def accept_adventure(request):
    return False

@require_authentication
def decline_adventure(request):
    return False

@require_authentication
def load_adventure(request):
    request.response["data"] = {
        "adventure_data": {}
    }
    try:
        adventure = Adventure.objects.get(adventureuser__user=request.user, date_finished=None)
    except:
        return
    adventure_data = {
        "name": adventure.name,
        "isFinished": False,
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
                "isChosen": adventureActivity.is_chosen,
                "votes": [
                    adventureActivityVote.user.username for adventureActivityVote in adventureActivity.adventureactivityvote_set.all()
                ]
            } for adventureActivity in adventure.adventureactivity_set.all()
        ],
    }
    if adventure.date_finished is not None:
        adventure_data["isFinished"] = True
    request.response["data"] = {
        "adventure_data": adventure_data
    }

@require_authentication
def load_completed_adventures(request):
    adventures = Adventure.objects.filter(adventureuser__user=request.user, date_finished__isnull=False)
    return [
        {
            "id": adventure.id,
            "name": adventure.name,
        } for adventure in adventures
    ]

@require_authentication
def invite_user(request):
    try:
        appUser = AppUser.objects.get(user__username=request.POST.get("username"))
        adventure = Adventure.objects.get(adventureuser__user=request.user, date_finished=None)
        adventureUser, created = AdventureUser.objects.get_or_create(adventure=adventure, user=appUser.user)
    except:
        request.response["success"] = False
        request.response["error_message"] = "An error occurred inviting user"

@require_authentication
def start_next_activity(request):
    #TODO: use the filters/activity types posted to filter random choices. related - do we allow duplicates? what happens when you get to the end?
    adventure = Adventure.objects.get(adventureuser__user=request.user, date_finished=None)

    max_group = adventure.adventureactivity_set.all().aggregate(Max("group"))["group__max"]
    if max_group == None:
        max_group = 0
    for activity in Activity.objects.order_by('?')[:3]:
        AdventureActivity.objects.create(adventure=adventure, activity=activity, group=max_group+1)

@require_authentication
def vote_activity(request):
    adventure = Adventure.objects.get(adventureuser__user=request.user, date_finished=None)
    adventureActivity =  adventure.adventureactivity_set.get(id=request.POST.get("id"))

    adventureActivityVote = None

    try:
        adventureActivityVote = AdventureActivityVote.objects.get(
            adventureActivity__adventure=adventure,
            adventureActivity__group=adventureActivity.group,
            user=request.user,
        )
    except:
        pass

    if adventureActivityVote is None: #TODO: should this restriction be enforced at the db?
        AdventureActivityVote.objects.create(adventureActivity=adventureActivity, user=request.user)

    number_of_votes = AdventureActivityVote.objects.filter(
        adventureActivity__adventure=adventure,
        adventureActivity__group=adventureActivity.group
    ).count()

    if number_of_votes == adventure.adventureuser_set.count():
        adventure.choose_activity_for_group(group=adventureActivity.group)

@require_authentication
def end_adventure(request):
    adventure = Adventure.objects.get(adventureuser__user=request.user, date_finished=None)
    adventure.date_finished = datetime.now()
    adventure.save()

@require_authentication
def load_achievements(request):
    pass
