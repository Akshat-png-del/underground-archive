from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("artists", views.ArtistViewSet, basename="artist")
router.register("cities", views.CityViewSet, basename="city")
router.register("venues", views.VenueViewSet, basename="venue")
router.register("fashion", views.FashionCategoryViewSet, basename="fashion")
router.register("editorial", views.EditorialArticleViewSet, basename="editorial")

urlpatterns = [
    path("search/", views.search, name="search"),
    path("", include(router.urls)),
]
