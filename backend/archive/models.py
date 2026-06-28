from django.db import models
from django.contrib.auth.models import User


class Genre(models.TextChoices):
    HARD_TECHNO = "hard-techno", "Hard Techno"
    SCHRANZ = "schranz", "Schranz"
    INDUSTRIAL_TECHNO = "industrial-techno", "Industrial Techno"
    ACID_TECHNO = "acid-techno", "Acid Techno"
    EBM = "ebm", "EBM"
    DARKWAVE = "darkwave", "Darkwave"
    POST_PUNK = "post-punk", "Post Punk"
    INDUSTRIAL = "industrial", "Industrial"
    EXPERIMENTAL = "experimental-electronic", "Experimental Electronic"
    HARDCORE = "hardcore", "Hardcore"
    GABBER = "gabber", "Gabber"
    NEO_RAVE = "neo-rave", "Neo Rave"


class Artist(models.Model):
    slug = models.SlugField(unique=True, max_length=120)
    name = models.CharField(max_length=200)
    portrait = models.URLField(blank=True)
    hero_image = models.URLField(blank=True)
    country = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    active_since = models.PositiveIntegerField()
    genres = models.JSONField(default=list)
    labels = models.JSONField(default=list)
    collectives = models.JSONField(default=list)
    website = models.URLField(blank=True)
    socials = models.JSONField(default=list)
    bio = models.TextField()
    signature_sound = models.JSONField(default=dict)
    essential_listening = models.JSONField(default=dict)
    essential_sets = models.JSONField(default=list)
    similar_artists = models.JSONField(default=list)
    aesthetic_profile = models.JSONField(default=dict)
    timeline = models.JSONField(default=list)
    featured = models.BooleanField(default=False)
    trending = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ArtistRating(models.Model):
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="ratings")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    energy = models.FloatField()
    darkness = models.FloatField()
    intensity = models.FloatField()
    innovation = models.FloatField()
    dancefloor_impact = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["artist", "user"]


class City(models.Model):
    slug = models.SlugField(unique=True, max_length=80)
    name = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    hero_image = models.URLField(blank=True)
    tagline = models.CharField(max_length=200)
    scene_history = models.TextField()
    venues_data = models.JSONField(default=list)
    record_stores = models.JSONField(default=list)
    vintage_stores = models.JSONField(default=list)
    tattoo_studios = models.JSONField(default=list)
    cafes = models.JSONField(default=list)
    districts = models.JSONField(default=list)
    etiquette = models.JSONField(default=list)
    dress_culture = models.TextField()
    safety_tips = models.JSONField(default=list)
    legends = models.JSONField(default=list)
    weekend_guide = models.JSONField(default=list)
    coordinates = models.JSONField(default=dict)

    def __str__(self):
        return self.name


class Venue(models.Model):
    slug = models.SlugField(unique=True, max_length=120)
    name = models.CharField(max_length=200)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="venue_list")
    hero_image = models.URLField(blank=True)
    history = models.TextField()
    music_styles = models.JSONField(default=list)
    crowd_profile = models.TextField()
    dress_code = models.TextField()
    entry_difficulty = models.CharField(max_length=20, default="moderate")
    sound_system = models.TextField()
    photo_policy = models.TextField()
    reviews = models.JSONField(default=list)

    def __str__(self):
        return self.name


class VenueRating(models.Model):
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name="ratings")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    underground_feel = models.FloatField()
    crowd_quality = models.FloatField()
    sound_quality = models.FloatField()
    inclusivity = models.FloatField()
    intensity = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["venue", "user"]


class FashionCategory(models.Model):
    slug = models.SlugField(unique=True, max_length=80)
    name = models.CharField(max_length=100)
    hero_image = models.URLField(blank=True)
    introduction = models.TextField()
    origins = models.TextField()
    evolution = models.TextField()
    designers = models.JSONField(default=list)
    creators = models.JSONField(default=list)
    brands = models.JSONField(default=list)
    essential_pieces = models.JSONField(default=list)
    styling_tips = models.JSONField(default=list)

    def __str__(self):
        return self.name


class EditorialArticle(models.Model):
    slug = models.SlugField(unique=True, max_length=200)
    title = models.CharField(max_length=300)
    excerpt = models.TextField()
    category = models.CharField(max_length=40)
    hero_image = models.URLField(blank=True)
    author = models.CharField(max_length=100)
    published_at = models.DateField()
    read_time = models.PositiveIntegerField(default=10)
    content = models.TextField()
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-published_at"]

    def __str__(self):
        return self.title


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="archive_profile")
    bio = models.TextField(blank=True)
    saved_artists = models.ManyToManyField(Artist, blank=True, related_name="saved_by")
    followed_aesthetics = models.ManyToManyField(FashionCategory, blank=True)
    reputation = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username
