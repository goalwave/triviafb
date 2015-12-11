 angular.module('triviafb')

 .factory('FBToken', function($resource){
     return $resource('https://localhost:8443/ws/service/fbtoken/:token');
 })


 .factory('Game', function($resource){
     return $resource('https://localhost:8443/ws/service/game/:id');
 })

 .service('AuthService', function($q, $http, $cookieStore, FBToken) {
   var currUser = {};
     var isAuthenticated;

   function loadUserCredentials() {
       var user = $cookieStore.get('userInfo');

       if (user) {
	   useCredentials(user);
       }
   }

   function storeUserCredentials(user) {
       $cookieStore.put('userInfo', user);
       useCredentials(user);
   }

   function useCredentials(user) {
       currUser = user;
       isAuthenticated = true;
       $http.defaults.headers.common['Authorization'] = "Bearer " + currUser.token;
       $http.defaults.headers.common['X-Username'] = currUser.email;
   }

   function destroyUserCredentials() {
       var removeUser = $cookieStore.get("userInfo");
       $cookieStore.remove("userInfo");
       if(removeUser){
	   if(removeUser.tokenType === "FACEBOOK"){
	       FB.api('/me/permissions', 'delete', {}, function (response) {
		   console.log('Facebook Delete RESPONSE: ' + angular.toJson(response));
	       })
	   }
	   if(removeUser.tokenType === "GOOGLE"){
	       auth2.disconnect();
	   }
       }
       $http.defaults.headers.common['Authorization'] = undefined;
       $http.defaults.headers.common['X-Username'] = undefined;
   }
     

    var fbLogin = function () {
	var myUser = {};
	var userInfo = {};
	var deferred = $q.defer();


        FB.login(function (response) {
	    var userInfo = {};
            if (response.authResponse) {
		userInfo = getUserInfo(response.authResponse.accessToken);
            } else {
                console.log('User cancelled login or did not fully authorize.');
            }
        }, {scope: 'email'});
	
        function getUserInfo(accessToken) {
	    var fbToken = {};

	    console.log('accessToken', accessToken);
            // get basic info
            FB.api('/me?fields=email,name', function (response) {
                console.log('Facebook Login RESPONSE: ' + angular.toJson(response), 'accessToken: ', accessToken);
                // get profile picture
                FB.api('/me/picture?type=normal', function (picResponse) {
                    console.log('Facebook Login RESPONSE: ' + picResponse.data.url);
                    response.imageUrl = picResponse.data.url;
		    
		    //Validate and extend token...
		    fbToken = FBToken.get({token:accessToken}, function() {
			console.log('fbToken:', fbToken);
			myUser.name = response.name;
			myUser.email = response.email;
			myUser.profilePic = picResponse.data.url;
			myUser.token = fbToken.token;
			myUser.tokenType = fbToken.type;
			
			$cookieStore.put('userInfo', myUser);
			console.log('myUser', myUser);
			deferred.resolve(myUser);
		    }, function(error) {
			console.log('error: ', error);
		    });
                });
            });
        }
	return deferred.promise;
    }

    function gOnSuccess(googleUser){
	console.log('in gOnSuccess');
	var profile = googleUser.getBasicProfile();
	var user = {};
	user.name = profile.getName();
	user.email = profile.getEmail();
	user.profilePic = profile.getImageUrl();
	$cookieStore.put('userInfo', user);
	$cookieStore.put('googleUser', googleUser);
	$state.go('dashboard');
    }
 
  var logout = function() {
    destroyUserCredentials();
  };
  
  loadUserCredentials();
 
  return {
    fbLogin: fbLogin,
    logout: logout,
    isAuthenticated: function() {return isAuthenticated;},
    email: function() {return email;},
    role: function() {return role;}
  };
})

.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
  return {
    responseError: function (response) {
      $rootScope.$broadcast({
        401: AUTH_EVENTS.notAuthenticated,
        403: AUTH_EVENTS.notAuthorized
      }[response.status], response);
      return $q.reject(response);
    }
  };
})
 
.config(function ($httpProvider) {
  $httpProvider.interceptors.push('AuthInterceptor');
})

