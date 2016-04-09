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

class Location(models.Model):
    name = models.CharField(max_length=100)
    date_created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ActivityType(models.Model):
    name = models.CharField(max_length=100)
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

class AdventureUser(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE)
    user = models.ForeignKey(User)
    is_host = models.BooleanField(default=False)
    date_created = models.DateTimeField(auto_now_add=True)

class AdventureActivity(models.Model):
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    date_created = models.DateTimeField(auto_now_add=True)

class AdventureActivityVote(models.Model):
    adventureActivity = models.ForeignKey(AdventureActivity, on_delete=models.CASCADE)
    adventureUser = models.ForeignKey(AdventureUser)
    date_created = models.DateTimeField(auto_now_add=True)
