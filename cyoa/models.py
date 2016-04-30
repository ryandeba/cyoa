import uuid, random

from django.db import models
from django.contrib.auth.models import User

WEEKDAYS = [
    (1, ("Monday")),
    (2, ("Tuesday")),
    (3, ("Wednesday")),
    (4, ("Thursday")),
    (5, ("Friday")),
    (6, ("Saturday")),
    (7, ("Sunday")),
]

class AppUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, null=True)
    #TODO: add reset code

    def __str__(self):
        return self.user.username

class Location(models.Model):
    name = models.CharField(max_length=100)
    date_created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ActivityType(models.Model):
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=100)
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Activity Types'

    def __str__(self):
        return self.name

class Activity(models.Model):
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    activityType = models.ForeignKey(ActivityType, on_delete=models.CASCADE) #TODO: should this be many to many?
    name = models.CharField(max_length=100)
    url = models.CharField(max_length=100, blank=True, null=True)
    maps_url = models.CharField(max_length=400, blank=True, null=True)
    facebook_url = models.CharField(max_length=400, blank=True, null=True)
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Activities'

    def __str__(self):
        return self.name

class ActivityHours(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    weekday = models.IntegerField(choices=WEEKDAYS)
    open_time = models.TimeField()
    open_duration = models.DurationField()

    class Meta:
        verbose_name_plural = 'Activity Hours'
        unique_together = ('activity', 'weekday',)

class Adventure(models.Model):
    name = models.CharField(max_length=100)
    date_created = models.DateTimeField(auto_now_add=True)
    date_finished = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Adventures'

    def __str__(self):
        return self.name

    def choose_activity_for_group(self, group):
        max_votes = 0

        possible_adventure_activities = []

        adventureActivities = self.adventureactivity_set.filter(group=group)

        for adventureActivity in adventureActivities:
            if adventureActivity.is_chosen:
                return

            number_of_votes = adventureActivity.adventureactivityvote_set.count()
            max_votes = max(max_votes, number_of_votes)

        for adventureActivity in adventureActivities:
            if adventureActivity.adventureactivityvote_set.count() == max_votes:
                possible_adventure_activities.append(adventureActivity)

        chosen_adventure_activity = random.choice(possible_adventure_activities)
        chosen_adventure_activity.is_chosen = True
        chosen_adventure_activity.save()


class AdventureUser(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE)
    user = models.ForeignKey(User)
    is_host = models.BooleanField(default=False)
    has_accepted = models.BooleanField(default=False)
    date_created = models.DateTimeField(auto_now_add=True)

class AdventureActivity(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    group = models.IntegerField()
    is_chosen = models.BooleanField(default=False)
    date_created = models.DateTimeField(auto_now_add=True)

class AdventureActivityVote(models.Model):
    adventureActivity = models.ForeignKey(AdventureActivity, on_delete=models.CASCADE)
    user = models.ForeignKey(User)
    date_created = models.DateTimeField(auto_now_add=True)
