<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1 v-if="frag" v-text="frag.name" />
      </v-col>
    </v-row>

    <!-- The card -->
    <v-row>
      <v-col cols="auto">
        <v-card v-if="frag" max-width="300">
          <v-img
            v-if="frag.picture"
            :src="`${$config.BC_UPLOADS_URL}/${frag.picture}`"
            max-width="300px"
            max-height="200px"
          />
          <v-img
            v-else
            max-width="300px"
            max-height="200px"
            src="/picture-placeholder.png"
          />
          <v-card-subtitle v-text="frag.scientificName" />
          <v-card-text>
            <v-chip label v-text="frag.type" />
            <v-chip v-if="frag.age" label v-text="frag.age" />
            <v-chip v-if="frag.isAvailable" label v-text="`${frag.fragsAvailable} available`" />
          </v-card-text>
          <v-divider />

          <!--
              A line item that expands to show a small form to make frags available
              only if the user owns this frag
          -->
          <div v-if="isOwner">
            <v-card-actions>
              <h3>Update available frags</h3>
              <v-spacer />
              <v-btn
                icon
                @click="showMakeFragsAvailable = !showMakeFragsAvailable"
              >
                <v-icon>{{ showMakeFragsAvailable ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </v-btn>
            </v-card-actions>

            <v-expand-transition>
              <div v-show="showMakeFragsAvailable">
                <v-divider />
                <v-card-text>
                  You can change the number of available frags here. If you increase it,
                  users that are interested will be notified. You can also decrease it
                  if you no longer have all of those frags.
                </v-card-text>

                <validation-observer ref="fragsAvailableObserver" v-slot="{ invalidFragsAvailable }">
                  <v-form
                    id="update-frags-available"
                    @submit.prevent="submitPreventFragsAvailable"
                    @submit="submitFragsAvailable"
                  >
                    <v-container>
                      <v-row>
                        <v-col cols="auto">
                          <validation-provider
                            v-slot="{ errors }"
                            rules="required|integer|min_value:0"
                            name="frags available"
                          >
                            <v-text-field
                              id="fragsAvailable"
                              v-model="fragsAvailable"
                              label="Frags available"
                              name="fragsAvailable"
                              type="number"
                              min="0"
                              :error-messages="errors"
                              required
                              outlined
                            />
                          </validation-provider>
                          <!-- TODO: the button is not getting disabled when validation fails -->
                          <v-btn
                            color="secondary"
                            type="submit"
                            :disabled="invalidFragsAvailable"
                          >
                            Update
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-container>
                  </v-form>
                </validation-observer>
              </div>
            </v-expand-transition>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Temporary alert we show at the bottom when changes are made -->

    <v-snackbar v-model="snackbar" timeout="3000">
      {{ snackbarText }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false">
          OK
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
<script>
// This imports the validation observer, provider and all the
// rules with their messages
import { ValidationObserver, ValidationProvider } from 'vee-validate/dist/vee-validate.full.esm'

export default {
  components: {
    ValidationObserver,
    ValidationProvider
  },
  async fetch () {
    const fragId = this.$route.params.id
    const { user, isOwner, frag, journals } = await this.$axios.$get(`/bc/api/dbtc/frag/${fragId}`)
    this.user = user
    this.isOwner = isOwner
    this.frag = frag
    this.journals = journals

    this.fragsAvailable = frag.fragsAvailable
  },
  data () {
    return {
      user: null,
      isOwner: null,
      frag: null,
      journals: null,

      showMakeFragsAvailable: false,
      fragsAvailable: 0,
      snackbar: false,
      snackbarText: ''
    }
  },
  methods: {
    submitPreventFragsAvailable () {
      this.$refs.fragsAvailableObserver.validate()
    },

    async submitFragsAvailable () {
      await this.$axios.$put(`/bc/api/dbtc/frag/${this.frag.fragId}/available/${this.fragsAvailable}`)
      // This will update the chip
      this.frag.fragsAvailable = this.fragsAvailable
      this.snackbarText = `${this.fragsAvailable} made available`
      this.snackbar = true
    }
  }
}
</script>
