define(
    [
        'angular',
        'nprogress',

        'app/Main/component/controller/AppController',
        'app/Main/component/controller/NavbarController',

        'app/Main/component/service/Notification',
        'app/Main/component/service/Search',

        'app/Main/config/routing',
        'app/Main/config/loadHttpInterceptor',
        'app/Main/config/loadLocales',

        'app/Main/run/loadStateErrorListener',
        'app/Main/run/loadProgress',
        'app/Main/run/loadOfflineStatusUpdate',

        'text!app/config.json',

        'ui-router', 'angular-translate', 'angular-translate-storage-cookie', 'ui-bootstrap-tpls', 'angular-cookies'
    ],
    function (
        angular,
        NProgress,

        AppController,
        NavbarController,

        Notification,
        Search,

        routing,
        loadHttpInterceptor,
        loadLocales,

        loadStateErrorListener,
        loadProgress,
        loadOfflineStatusUpdate,

        config
    ) {
        'use strict';

        var MainModule = angular.module('main', [
            'ui.router',
            'pascalprecht.translate',
            'ui.bootstrap',
            'ngCookies'
        ]);

        MainModule.controller('AppController', AppController);
        MainModule.controller('NavbarController', NavbarController);

        MainModule.factory('$progress', function() { return NProgress; });

        MainModule.service('$notification', Notification);
        MainModule.service('$search', Search);

        MainModule.config(routing);
        MainModule.config(loadHttpInterceptor);
        MainModule.config(loadLocales);

        MainModule.run(loadStateErrorListener);
        MainModule.run(loadProgress);
        MainModule.run(loadOfflineStatusUpdate);

        return MainModule;
    }
);