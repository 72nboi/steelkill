"""Process-local compatibility for Instaloader's retired login query.

See https://github.com/instaloader/instaloader/pull/2795.
The installed package is unchanged. Authentication still requires a valid session.
"""

import inspect

import instaloader
from instaloader.exceptions import InstaloaderException


def apply_compatibility():
    context_class = instaloader.InstaloaderContext
    try:
        legacy_login = "d6f4427fbe92d846298cf93df0b937d3" in inspect.getsource(
            context_class.test_login
        )
    except (OSError, TypeError):
        legacy_login = False
    if not legacy_login:
        return False

    original_query = context_class.doc_id_graphql_query

    def web_metadata_query(self, doc_id, variables, referer=None, web_api=False):
        # Only the profile and post metadata operations affected by the upstream bug.
        if doc_id in {"27937681195819736", "27128499623469141"}:
            web_api = True
        return original_query(self, doc_id, variables, referer, web_api=web_api)

    def session_username(self):
        if self.user_id is None:
            self.error("No Instagram account ID in imported cookies. Check the browser profile selected by -CookieFile.")
            return None
        try:
            # A public profile lookup alone is not proof of a logged-in session.
            if not self._web_api_tokens().get("fb_dtsg"):
                self.error("Instagram did not provide authenticated web tokens. Sign in and complete verification in the selected browser/profile.")
                return None
            profile = instaloader.Profile.from_id(self, int(self.user_id))
            return profile.username
        except (InstaloaderException, ValueError, KeyError, TypeError):
            self.error("Could not validate the Instagram session using the web API. Instagram may require verification or be limiting requests; try again later.")
            return None

    context_class.doc_id_graphql_query = web_metadata_query
    context_class.test_login = session_username
    return True


if __name__ == "__main__":
    from instaloader.__main__ import main

    if apply_compatibility():
        print("Applying local Instaloader login/metadata compatibility fix (upstream #2795).", flush=True)
    main()
