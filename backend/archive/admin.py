from django.contrib import admin
from .models import (
    Artist,
    ArtistRating,
    City,
    EditorialArticle,
    FashionCategory,
    UserProfile,
    Venue,
    VenueRating,
)


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "country", "city", "active_since", "featured")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "country", "city")


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "city", "entry_difficulty")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "country")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(FashionCategory)
class FashionCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(EditorialArticle)
class EditorialArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "category", "published_at", "featured")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "reputation", "created_at")


admin.site.register(ArtistRating)
admin.site.register(VenueRating)
