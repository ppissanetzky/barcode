<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>Add a new item</h1>
      </v-col>
    </v-row>

    <!-- The card with the form -->

    <v-row>
      <v-col>
        <v-card>
          <!-- Watches over the form and disables the button if validation fails -->
          <validation-observer ref="observer" v-slot="{ invalid }">
            <v-form
              id="add-new-item"
              @submit.prevent="submitPrevent"
              @submit="submit"
            >
              <!-- Required information -->
              <v-container>
                <v-row>
                  <v-col><h3>Required information</h3></v-col>
                </v-row>

                <!-- Name -->

                <v-row>
                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required"
                      name="name"
                    >
                      <v-text-field
                        id="name"
                        v-model="name"
                        label="Name"
                        name="name"
                        hint="Common name"
                        persistent-hint
                        :error-messages="errors"
                        required
                        outlined
                      />
                    </validation-provider>
                  </v-col>

                  <!-- Type -->

                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required"
                      name="type"
                    >
                      <v-select
                        id="type"
                        v-model="type"
                        label="Type"
                        name="type"
                        :items="types"
                        item-value="type"
                        item-text="type"
                        :error-messages="errors"
                        required
                        outlined
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <v-row>
                  <!-- Date acquired -->

                  <v-col>
                    <bc-date-picker
                      v-model="dateAcquired"
                      label="Date acquired"
                      name="date acquired"
                      hint="The date you got it"
                    />
                  </v-col>

                  <!-- Frags available -->

                  <v-col>
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
                        hint="The number of frags available now"
                        persistent-hint
                        type="number"
                        min="0"
                        :error-messages="errors"
                        required
                        outlined
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <!-- Picture -->

                <v-row>
                  <v-col>
                    <validation-provider
                      v-slot="{ errors, validate }"
                      rules="required|image"
                      name="picture"
                    >
                      <v-file-input
                        id="picture"
                        v-model="picture"
                        required
                        outlined
                        label="Picture"
                        name="picture"
                        accept="image/*"
                        prepend-icon=""
                        :error-messages="errors"
                        @change="validate"
                      />
                    </validation-provider>
                  </v-col>
                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required"
                      name="rules"
                    >
                      <v-select
                        id="type"
                        v-model="rules"
                        label="Rules"
                        name="rules"
                        :items="allRules"
                        item-value="rule"
                        item-text="rule"
                        :error-messages="errors"
                        required
                        outlined
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <div v-if="rules === 'DBTC'">
                      <p>Choose whether you would like BARcode to create a new thread to
                        track this item or use an existing thread. You should use an
                        existing thread if the item is already in DBTC.</p>
                      <div v-if="!type">
                        <p
                          class="red--text"
                        >
                          Please select the item's "type" above.
                        </p>
                      </div>
                      <div v-else>
                        <validation-provider
                          v-slot="{ errors }"
                          rules="required"
                          name="thread"
                        >
                          <v-autocomplete
                            id="type"
                            v-model="threadId"
                            label="Thread"
                            name="thread"
                            :items="threadsByType[type]"
                            item-value="threadId"
                            item-text="title"
                            :error-messages="errors"
                            required
                            outlined
                            clearable
                          />
                        </validation-provider>
                      </div>
                    </div>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <v-divider />
                    <v-card-actions>
                      <h3>Additional details - optional</h3>
                      <v-spacer />
                      <v-btn
                        icon
                        @click="showAdditionalDetails = !showAdditionalDetails"
                      >
                        <v-icon>{{ showAdditionalDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </v-card-actions>

                    <v-expand-transition>
                      <v-container fluid v-show="showAdditionalDetails">

                        <!-- Size -->
                        <v-row>
                          <v-col>
                            <v-text-field
                              id="size"
                              v-model="size"
                              label="Size"
                              name="size"
                              hint="Polyps, heads or inches"
                              persistent-hint
                              outlined
                            />
                          </v-col>
                        </v-row>

                        <!-- Scientific name -->

                        <v-row>
                          <v-col>
                            <v-text-field
                              id="scientificName"
                              v-model="scientificName"
                              outlined
                              label="Scientific name"
                              name="scientificName"
                            />
                          </v-col>
                        </v-row>

                        <!-- Notes -->

                        <v-row>
                          <v-col>
                            <v-textarea
                              id="notes"
                              v-model="notes"
                              outlined
                              label="Notes"
                              name="notes"
                              auto-grow
                              rows="1"
                            />
                          </v-col>
                        </v-row>

                        <!-- Light and flow -->

                        <v-row>
                          <v-col>
                            <v-select
                              id="light"
                              v-model="light"
                              outlined
                              label="Light"
                              name="light"
                              :items="['Low','Medium','High']"
                            />
                          </v-col>
                          <v-col>
                            <v-select
                              id="flow"
                              v-model="flow"
                              outlined
                              label="Flow"
                              name="flow"
                              :items="['Low','Medium','High']"
                            />
                          </v-col>
                        </v-row>

                        <!-- Hardiness and growth rate -->

                        <v-row>
                          <v-col>
                            <v-select
                              id="hardiness"
                              v-model="hardiness"
                              outlined
                              label="Hardiness"
                              name="hardiness"
                              :items="['Sensitive','Normal','Hardy']"
                            />
                          </v-col>
                          <v-col>
                            <v-select
                              id="growthRate"
                              v-model="growthRate"
                              outlined
                              label="Growth rate"
                              name="growthRate"
                              :items="['Slow','Normal','Fast']"
                            />
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-expand-transition>
                  </v-col>
                </v-row>
                    <!-- Source -->

                <v-row>
                  <v-col>
                    <v-divider />
                    <v-card-actions>
                      <h3>Source details - optional</h3>
                      <v-spacer />
                      <v-btn
                        icon
                        @click="showSourceDetails = !showSourceDetails"
                      >
                        <v-icon>{{ showSourceDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </v-card-actions>

                    <v-expand-transition>
                      <v-container fluid v-show="showSourceDetails">

                          <!-- Source type and name -->

                          <v-row>
                            <v-col>
                              <v-select
                                id="sourceType"
                                v-model="sourceType"
                                outlined
                                label="Source type"
                                name="sourceType"
                                :items="['Member','LFS','Online', 'Other']"
                                hint="Where you got it"
                                persistent-hint
                              />
                            </v-col>
                            <v-col>
                              <v-text-field
                                id="source"
                                v-model="source"
                                outlined
                                label="Source name"
                                name="source"
                              />
                            </v-col>
                          </v-row>

                          <!-- Cost -->

                          <v-row>
                            <v-col>
                              <validation-provider
                                v-slot="{ errors }"
                                rules="double"
                                name="cost"
                              >
                                <v-text-field
                                  id="cost"
                                  v-model="cost"
                                  outlined
                                  label="Cost"
                                  name="cost"
                                  hint="How much you paid for it"
                                  persistent-hint
                                  :error-messages="errors"
                                />
                              </validation-provider>
                            </v-col>
                          </v-row>

                      </v-container>
                    </v-expand-transition>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-divider />
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-btn
                      color="primary"
                      type="submit"
                      :disabled="invalid || loading"
                      :loading="loading"
                      @click="loader = 'loading'"
                    >
                      Add it now
                    </v-btn>
                  </v-col>
                </v-row>
              </v-container>
            </v-form>
          </validation-observer>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
// This imports the validation observer, provider and all the
// rules with their messages
import { ValidationObserver, ValidationProvider } from 'vee-validate/dist/vee-validate.full.esm'
import { utcIsoStringFromString } from '~/dates'
import BcDatePicker from '~/components/BcDatePicker.vue'

export default {
  components: {
    ValidationObserver,
    ValidationProvider,
    BcDatePicker
  },
  async fetch () {
    const { types, rules } = await this.$axios.$get('/bc/api/dbtc/enums')
    this.types = types
    this.allRules = rules
  },
  data () {
    return {
      name: undefined,
      type: undefined,
      dateAcquired: undefined,
      fragsAvailable: 0,
      picture: undefined,
      size: undefined,
      scientificName: undefined,
      notes: undefined,
      light: 'Medium',
      flow: 'Medium',
      hardiness: 'Normal',
      growthRate: 'Normal',
      sourceType: 'Other',
      source: undefined,
      cost: '0.00',
      rules: 'DBTC',
      threadId: undefined,

      // Enums
      types: [],
      allRules: [],
      threadsByType: {},

      // For the loading animation on the add it now button
      loading: false,
      showAdditionalDetails: false,
      showSourceDetails: false
    }
  },
  watch: {
    async type (value) {
      if (this.threadsByType[value]) {
        return
      }
      const { threads } = await this.$axios.$get(`/bc/api/dbtc/threads-for-type?type=${encodeURIComponent(value)}`)
      this.threadsByType[value] = [
        { threadId: 0, title: '<Create a new thread>' },
        ...threads
      ]
    }
  },
  methods: {
    submitPrevent () {
      this.$refs.observer.validate()
    },

    async submit () {
      this.loading = true
      try {
        const formData = new FormData()
        const keys = [
          'name',
          'type',
          // 'dateAcquired', - added below
          'fragsAvailable',
          'picture',
          'size',
          'scientificName',
          'notes',
          'light',
          'flow',
          'hardiness',
          'growthRate',
          'sourceType',
          'source',
          'cost',
          'rules',
          'threadId'
        ]

        keys.forEach((key) => {
          const value = this.$data[key]
          if (typeof value !== 'undefined') {
            formData.set(key, value)
          }
        })

        // Convert the local date (only) to a full date/time with TZ information
        formData.set('dateAcquired', utcIsoStringFromString(this.dateAcquired))

        const { fragId } = await this.$axios.$post('/bc/api/dbtc/add-new-item', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        // Navigate to the details page for this frag, replacing
        // this page in the history, so that going back from the
        // details takes us back to the previous page and not this
        // one
        this.$router.replace(`frag/${fragId}`)
      } finally {
        // Turn off the loading button
        this.loading = false
      }
    }
  }
}
</script>
