from django.test import TestCase

from cyoa.models import AppUser, Location, ActivityType, Activity, Adventure, AdventureUser, AdventureActivity, AdventureActivityVote
from django.contrib.auth.models import User

class Adventure_choose_activity_for_group(TestCase):

    user = User.objects.create(username="test")

    adventure = Adventure.objects.create()

    location = Location.objects.create(name="location 1")

    activityType = ActivityType.objects.create(name="activity type 1", key="1")

    activity1 = Activity.objects.create(
        location=location,
        activityType=activityType,
        name="activity1",
    )

    activity2 = Activity.objects.create(
        location=location,
        activityType=activityType,
        name="activity2",
    )

    adventureActivity1 = AdventureActivity.objects.create(
        adventure=adventure,
        activity=activity1,
        group=1,
    )

    adventureActivity2 = AdventureActivity.objects.create(
        adventure=adventure,
        activity=activity2,
        group=1,
    )

    AdventureActivityVote.objects.create(
        adventureActivity=adventureActivity2,
        user=user
    )

    def test_choose_activity_for_group(self):
        self.adventure.choose_activity_for_group(1)
        result = self.adventure.adventureactivity_set.filter(is_chosen=1)
        self.assertTrue(len(result) == 1)
