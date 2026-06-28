from rest_framework import serializers
from .models import Artist, City, EditorialArticle, FashionCategory, Venue


class ArtistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artist
        fields = "__all__"


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = "__all__"


class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = "__all__"


class FashionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FashionCategory
        fields = "__all__"


class EditorialArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = EditorialArticle
        fields = "__all__"
